import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000/api"
});

API.interceptors.request.use((config) => {
    const token = localStorage.getItem("vitalis_token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

export const register = async (data) => {
    const response = await API.post(
        "/users/register",
        data
    );

    return response.data;
};

export const login = async (data) => {
    const response = await API.post(
        "/users/login",
        data
    );

    return response.data;
};

export const getCurrentUser = async () => {
    const response = await API.get("/users/me");

    return response.data;
};

export const getHealthReadings = async () => {
    const response = await API.get("/health/readings");

    return response.data;
};

export const getEnvironmentReadings = async () => {
    const response = await API.get(
        "/environment/readings"
    );

    return response.data;
};

export const getRiskHistory = async () => {
    const response = await API.get("/ai/history");

    return response.data;
};

export const analyzeRisk = async (data) => {
    const response = await API.post(
        "/ai/analyze",
        data
    );

    return response.data;
};

export default API;