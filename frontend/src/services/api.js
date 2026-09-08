import axios from 'axios';

/**
 * Determine the API base URL.
 *
 * - In development: Vite proxies /api → localhost:8000, so we use relative URLs.
 * - In production (Docker/deployed): VITE_API_BASE_URL can be set to the backend URL,
 *   or left empty to rely on the nginx proxy (recommended).
 */
const API_BASE_URL = (() => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  // Non-localhost host (ngrok, cloud) → use relative URLs via proxy
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return '';
  }
  // Explicit env override provided and different from default
  if (envUrl && envUrl !== 'http://localhost:8000' && envUrl !== 'http://127.0.0.1:8000') {
    return envUrl;
  }
  // Default: use Vite proxy → relative paths
  return '';
})();

/** Axios instance pre-configured with /api/v1 base path */
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Attach Authorization header if JWT session token exists in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('openoutreach_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Helper: direct requests (not /api/v1 prefixed) */
const rawApi = (path) =>
  axios.get(API_BASE_URL ? `${API_BASE_URL}${path}` : path, { timeout: 10000 });

// ── Authentication ────────────────────────────────────────────────────────────
export const loginUser       = async (credentials) => (await api.post('/auth/login', credentials)).data;
export const registerUser    = async (userData)    => (await api.post('/auth/register', userData)).data;
export const logoutUser      = async ()            => (await api.post('/auth/logout')).data;
export const getCurrentUser  = async ()            => (await api.get('/auth/me')).data;

// ── Health ────────────────────────────────────────────────────────────────────
export const checkHealth          = async () => (await rawApi('/health')).data;
export const checkDbHealth        = async () => (await rawApi('/health/db')).data;
export const checkLeadProviderHealth = async () => (await api.get('/lead-provider/health')).data;

// ── Copilot ───────────────────────────────────────────────────────────────────
export const generateCampaignPlan = async (productDocs, targetPrompt, options = {}) =>
  (await api.post('/copilot/generate-plan', { product_docs: productDocs, target_prompt: targetPrompt, ...options })).data;

export const getDatasetAccuracy   = async (payload) =>
  (await api.post('/copilot/dataset-accuracy', payload)).data;

// ── Settings ──────────────────────────────────────────────────────────────────
export const getSiteConfig    = async () => (await api.get('/config')).data;
export const updateSiteConfig = async (config) => (await api.put('/config', config)).data;

// ── Campaigns & Sequences ───────────────────────────────────────────────────
export const getCampaigns         = async () => (await api.get('/campaigns')).data;
export const createCampaign       = async (data) => (await api.post('/campaigns', data)).data;
export const updateCampaign       = async (id, data) => (await api.put(`/campaigns/${id}`, data)).data;
export const deleteCampaign       = async (id) => (await api.delete(`/campaigns/${id}`)).data;
export const getCampaignLeads     = async (campaignId) => (await api.get(`/campaigns/${campaignId}/leads`)).data;
export const getCampaignLead      = async (campaignId, leadId) => (await api.get(`/campaigns/${campaignId}/leads/${leadId}`)).data;
export const generateLeadPool     = async (campaignId) => (await api.post(`/campaigns/${campaignId}/generate-lead-pool`)).data;
export const discoverCampaignLeads = async (campaignId) => (await api.post(`/campaigns/${campaignId}/leads/discover`)).data;
export const getLeadPoolStatus    = async (campaignId) => (await api.get(`/campaigns/${campaignId}/lead-pool-status`)).data;
export const regenerateLeadPool   = async (campaignId) => (await api.post(`/campaigns/${campaignId}/regenerate-lead-pool`)).data;
export const acceptLead           = async (campaignId, leadId) => (await api.post(`/campaigns/${campaignId}/leads/${leadId}/accept`)).data;
export const acceptBatchLeads      = async (campaignId, leadIds) => (await api.post(`/campaigns/${campaignId}/accept-leads`, { lead_ids: leadIds })).data;
export const acceptAllLeads       = async (campaignId) => (await api.post(`/campaigns/${campaignId}/accept-all-leads`)).data;
export const controlCampaign      = async (campaignId, action) => (await api.post(`/campaigns/${campaignId}/control?action=${action}`)).data;
export const updateCampaignSequenceTimer = async (campaignId, value, unit = 'min') => (await api.post(`/campaigns/${campaignId}/sequence-timer`, { value: parseFloat(value), unit: unit })).data;

// Sequence Automation APIs
export const getCampaignSequence         = async (campaignId) => (await api.get(`/sequences/campaign/${campaignId}`)).data;
export const saveCampaignSequence        = async (campaignId, payload) => (await api.put(`/sequences/campaign/${campaignId}`, payload)).data;
export const resetCampaignSequenceDefault = async (campaignId) => (await api.post(`/sequences/campaign/${campaignId}/reset-default`)).data;
export const addCampaignSequenceStep     = async (campaignId, payload) => (await api.post(`/sequences/campaign/${campaignId}/steps`, payload)).data;
export const deleteCampaignSequenceStep  = async (stepId) => (await api.delete(`/sequences/steps/${stepId}`)).data;


// ── Leads ─────────────────────────────────────────────────────────────────────
export const getLeads  = async (campaignId) =>
  (await api.get('/leads', { params: campaignId ? { campaign_id: campaignId } : {} })).data;
export const getLead   = async (leadId) => (await api.get(`/leads/${leadId}`)).data;
export const createLead = async (data) => (await api.post('/leads', data)).data;
export const updateLead = async (leadId, data) => (await api.put(`/leads/${leadId}`, data)).data;
export const deleteLead = async (leadId) => (await api.delete(`/leads/${leadId}`)).data;
export const checkLeadDuplicate = async (data) => (await api.post('/leads/check-duplicate', data)).data;
export const executeLeadDuplicateAction = async (payload) => (await api.post('/leads/duplicate-action', payload)).data;


// ── Deals ─────────────────────────────────────────────────────────────────────
export const getDeals       = async () => (await api.get('/deals')).data;
export const createDeal     = async (data) => (await api.post('/deals', data)).data;
export const deleteDeal     = async (dealId) => (await api.delete(`/deals/${dealId}`)).data;
export const generateOpener = async (dealId) => (await api.post(`/deals/${dealId}/generate-opener`)).data;


// ── Mailboxes ─────────────────────────────────────────────────────────────────
export const getMailboxes   = async () => (await api.get('/mailboxes')).data;
export const createMailbox  = async (data) => (await api.post('/mailboxes', data)).data;

// ── RAG Knowledge ─────────────────────────────────────────────────────────────
export const getKnowledgeDocs   = async () => (await api.get('/knowledge')).data;
export const uploadKnowledgeDoc = async (data) => (await api.post('/knowledge', data)).data;
export const uploadKnowledgeFile = async (file, category) => {
  const formData = new FormData();
  formData.append('file', file);
  if (category) formData.append('category', category);
  return (await api.post('/knowledge/upload-file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })).data;
};
export const searchKnowledge = async (query) =>
  (await api.post('/knowledge/search', { query, top_k: 3 })).data;

// ── CSV Upload ────────────────────────────────────────────────────────────────
export const getCsvFiles              = async () => (await api.get('/csv/files')).data;
export const getCsvPreview            = async (filename) => (await api.get(`/csv/preview/${filename}`)).data;
export const getDatasetValidationStats = async () => (await api.get('/csv/validation-stats')).data;
export const uploadCsvFile            = async (file, importAsLeads = true, importMode = 'append') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('import_as_leads', importAsLeads);
  formData.append('import_mode', importMode);
  return (await api.post('/csv/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })).data;
};
export const importCsvFile = async (filename, campaignId, importMode = 'append') =>
  (await api.post(`/csv/import/${filename}?import_mode=${importMode}${campaignId ? `&campaign_id=${campaignId}` : ''}`)).data;
export const deleteCsvFile = async (filename) =>
  (await api.delete(`/csv/files/${encodeURIComponent(filename)}`)).data;
export const resetMasterDb = async () =>
  (await api.post('/leads/reset-master-db')).data;

// ── AI Copilot ────────────────────────────────────────────────────────────────
export const getLead360      = async (leadId) => (await api.get(`/copilot/lead-360/${leadId}`)).data;
export const classifyReply   = async (inbound_email_body) =>
  (await api.post('/copilot/classify-reply', { inbound_email_body })).data;

// ── Attachments ───────────────────────────────────────────────────────────────
export const uploadAttachment = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return (await api.post('/attachments/upload', formData, {
    headers: { 'Content-Type': undefined },
  })).data;
};

// ── Pipeline & Campaign Execution ─────────────────────────────────────────────
export const seedTestRecipients  = async (campaignId) =>
  (await api.post(`/pipeline/seed-test-recipients?campaign_id=${campaignId}`)).data;
export const prepareEmail        = async (dealId) =>
  (await api.post(`/pipeline/deals/${dealId}/prepare-email`)).data;
export const sendCampaign        = async (dealId, payload) =>
  (await api.post(`/pipeline/deals/${dealId}/send-campaign`, payload)).data;
export const simulateEngagement  = async (dealId, action) =>
  (await api.post(`/pipeline/deals/${dealId}/simulate-engagement?action=${action}`)).data;
export const getDealEvents       = async (dealId) =>
  (await api.get(`/pipeline/deals/${dealId}/events`)).data;
export const getABMetrics        = async () => (await api.get('/pipeline/ab-metrics')).data;
export const getPipelineAnalytics = async () => (await api.get('/pipeline/analytics')).data;
export const getCampaignExecution = async (campaignId) =>
  (await api.get(`/pipeline/campaigns/${campaignId}/execution`)).data;
export const getDealExecution    = async (dealId) =>
  (await api.get(`/pipeline/deals/${dealId}/execution`)).data;
export const getRunnerStatus     = async () => (await api.get('/pipeline/campaign-runner/status')).data;
export const getDealThread       = async (dealId) =>
  (await api.get(`/pipeline/deals/${dealId}/thread`)).data;
export const syncInbox            = async (dealId) =>
  (await api.post(`/pipeline/deals/${dealId}/sync-inbox`)).data;
export const executeAction        = async (dealId, payload) =>
  (await api.post(`/pipeline/deals/${dealId}/execute-action`, payload)).data;
export const aiAssistComposer     = async (dealId, payload) =>
  (await api.post(`/pipeline/deals/${dealId}/ai-assist-composer`, payload)).data;

// Backward-compatible aliases
export const seedDemoData        = (campaign_id) => seedTestRecipients(campaign_id);
export const generateEmailForDeal = prepareEmail;
export const sendEmailForDeal    = (dealId, payload) => sendCampaign(dealId, payload);
export const simulateReply       = (dealId) => simulateEngagement(dealId, 'reply');

export default api;
