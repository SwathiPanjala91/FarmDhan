import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Dynamically resolve the candidate backend hosts across Android USB ADB, Wi-Fi LAN, and Web
const getMetroHost = () => {
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.manifest2?.extra?.expoClient?.hostUri ||
      Constants.manifest?.debuggerHost ||
      Constants.manifest?.hostUri;

    if (hostUri) {
      const host = hostUri.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return host;
      }
    }
  } catch {
    // ignore
  }
  return null;
};

export const getCandidateApiUrls = () => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return [`http://${window.location.hostname}:5000/api`, 'http://localhost:5000/api'];
    }
    return ['http://localhost:5000/api'];
  }

  const metroHost = getMetroHost();
  const urls = [];

  // 1. USB reverse loopback endpoint (works when `adb reverse tcp:5000 tcp:5000` is active)
  urls.push('http://127.0.0.1:5000/api');

  // 2. Metro host if running over Wi-Fi
  if (metroHost) {
    urls.push(`http://${metroHost}:5000/api`);
  }

  // 3. Known development LAN IP fallback
  if (!metroHost || metroHost !== '192.168.0.48') {
    urls.push('http://192.168.0.48:5000/api');
  }

  // 4. Android emulator fallback (10.0.2.2)
  if (Platform.OS === 'android') {
    urls.push('http://10.0.2.2:5000/api');
  }

  return urls;
};

export const resolveApiBaseUrl = () => {
  const candidates = getCandidateApiUrls();
  return candidates[0];
};

export let API_BASE_URL = resolveApiBaseUrl();

export const setActiveApiBaseUrl = (url) => {
  if (url && API_BASE_URL !== url) {
    console.log(`[API] Switching active API base URL to: ${url}`);
    API_BASE_URL = url;
  }
};

let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

const executeFetch = async (baseUrl, endpoint, options, timeoutMs = 7000) => {
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text || `Server error (${response.status})` };
      }
    }

    if (!response.ok) {
      const errorMsg = data?.message || `API Error: ${response.status}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};

const request = async (endpoint, options = {}) => {
  const candidates = [API_BASE_URL, ...getCandidateApiUrls().filter((u) => u !== API_BASE_URL)];
  let lastError = null;

  for (let i = 0; i < candidates.length; i++) {
    const targetBase = candidates[i];
    try {
      const data = await executeFetch(targetBase, endpoint, options, i === 0 ? 6000 : 5000);
      // If we connected using a fallback URL, save it as active
      if (targetBase !== API_BASE_URL) {
        setActiveApiBaseUrl(targetBase);
      }
      return data;
    } catch (err) {
      lastError = err;
      const isNetworkErr =
        err.name === 'AbortError' ||
        err.message === 'Network request failed' ||
        err.message === 'Failed to fetch' ||
        err.name === 'TypeError';

      if (!isNetworkErr || i === candidates.length - 1) {
        // If it's a HTTP error (e.g. 400/401/404) or all candidates failed, throw
        if (err.status) throw err;
        break;
      }
      console.warn(`[API Failover] Connection to ${targetBase} failed (${err.message}). Trying fallback...`);
    }
  }

  console.warn(`[API Request Error] ${endpoint}:`, lastError?.message);

  if (lastError?.name === 'AbortError') {
    throw new Error(
      `Connection timed out. FarmDhan server did not respond within timeout. Please ensure the backend is running on port 5000.`
    );
  }

  if (
    lastError?.message === 'Failed to fetch' ||
    lastError?.message === 'Network request failed' ||
    lastError?.name === 'TypeError'
  ) {
    throw new Error(
      `Unable to connect to FarmDhan server. Tried: ${candidates.slice(0, 2).join(', ')}. Please verify backend is running on port 5000.`
    );
  }

  throw lastError || new Error('Network request failed');
};

export const api = {
  auth: {
    checkHealth: () => request('/health'),
    login: (phone, password) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      }),
    sendOTP: (phone) =>
      request('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }),
    resendOTP: (phone) =>
      request('/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }),
    verifyOTP: (phone, otp, role = 'farmer', name = '', language = 'en') =>
      request('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, otp, role, name, language }),
      }),
    register: (userData) =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
    getMe: () => request('/auth/me'),
    updateProfile: (profileData) =>
      request('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      }),
  },

  listings: {
    create: (listingData) =>
      request('/listings', {
        method: 'POST',
        body: JSON.stringify(listingData),
      }),
    getAll: (params = '') => request(`/listings${params ? `?${params}` : ''}`),
    getMy: () => request('/listings/my'),
    getById: (id) => request(`/listings/${id}`),
    delete: (id) => request(`/listings/${id}`, { method: 'DELETE' }),
  },

  buyers: {
    getAll: (params = '') => request(`/buyers${params ? `?${params}` : ''}`),
    getNearby: (lat, lon, maxDistance = 100, wasteType = '') => {
      let query = `lat=${lat}&lon=${lon}&maxDistance=${maxDistance}`;
      if (wasteType) query += `&wasteType=${encodeURIComponent(wasteType)}`;
      return request(`/buyers/nearby?${query}`);
    },
    getById: (id) => request(`/buyers/${id}`),
    updateProfile: (data) =>
      request('/buyers/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    getDashboardStats: () => request('/buyers/dashboard/stats'),
  },

  matching: {
    getRecommended: (listingId) => request(`/matching/${listingId}`),
    getPriceComparison: (listingId) => request(`/matching/${listingId}/price-comparison`),
    getFarmerStats: () => request('/matching/farmer/stats'),
  },

  offers: {
    create: (offerData) =>
      request('/offers', {
        method: 'POST',
        body: JSON.stringify(offerData),
      }),
    getAll: (listingId = '') =>
      request(`/offers${listingId ? `?listingId=${listingId}` : ''}`),
    getById: (id) => request(`/offers/${id}`),
    updateStatus: (id, status) =>
      request(`/offers/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
  },

  transactions: {
    create: (transactionData) =>
      request('/transactions', {
        method: 'POST',
        body: JSON.stringify(transactionData),
      }),
    getAll: () => request('/transactions'),
    getById: (id) => request(`/transactions/${id}`),
    updateStatus: (id, updateData) =>
      request(`/transactions/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      }),
  },

  notifications: {
    getAll: () => request('/notifications'),
    markRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead: () => request('/notifications/read-all', { method: 'PUT' }),
  },

  ai: {
    chat: (message, history = [], language = 'en', listingContext = null, role = null) =>
      request('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message, history, language, listingContext, role }),
      }),
  },

  support: {
    getFPOs: (params = '') => request(`/support/fpos${params ? `?${params}` : ''}`),
    getKisanGroups: () => request('/support/kisan-groups'),
    getHelpline: () => request('/support/helpline'),
  },

  insights: {
    getMarketInsights: () => request('/insights'),
  },
};
