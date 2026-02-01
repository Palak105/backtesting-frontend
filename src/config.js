// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const API_ENDPOINTS = {
  INDICATORS: `${API_BASE_URL}/metadata/indicators`,
  APPLY_FILTERS: `${API_BASE_URL}/filters/apply`,
};

const config = {
  API_BASE_URL,
  API_ENDPOINTS,
};

export default config;
export { API_BASE_URL, API_ENDPOINTS };
