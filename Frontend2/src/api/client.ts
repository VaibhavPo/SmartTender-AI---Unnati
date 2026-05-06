import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchTenders = async () => {
  const { data } = await apiClient.get('/tenders');
  return data;
};

export const fetchVerdicts = async () => {
  const { data } = await apiClient.get('/verdicts');
  return data;
};
