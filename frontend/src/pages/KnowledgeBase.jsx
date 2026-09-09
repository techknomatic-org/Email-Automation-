import React, { useEffect, useState, useRef } from 'react';
import { getKnowledgeDocs, uploadKnowledgeDoc, uploadKnowledgeFile, searchKnowledge } from '../services/api';
import { Search, Plus, Upload, FileText, FileSpreadsheet, File, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

// ── File type helpers ─────────────────────────────────────────────────────────
const ACCEPTED_EXTENSIONS = ['txt', 'md', 'markdown', 'csv', 'pdf', 'doc', 'docx', 'xls', 'xlsx'];
const ACCEPT_ATTR = '.txt,.md,.markdown,.csv,.pdf,.doc,.docx,.xls,.xlsx';

const FILE_TYPE_META = {
  txt:      { label: 'TXT',  color: '#64748b', bg: 'rgba(100,116,139,0.15)', icon: FileText },
  md:       { label: 'MD',   color: '#818cf8', bg: 'rgba(129,140,248,0.15)', icon: FileText },
  markdown: { label: 'MD',   color: '#818cf8', bg: 'rgba(129,140,248,0.15)', icon: FileText },
  csv:      { label: 'CSV',  color: '#34d399', bg: 'rgba(52,211,153,0.15)',  icon: FileSpreadsheet },
  pdf:      { label: 'PDF',  color: '#f87171', bg: 'rgba(248,113,113,0.15)', icon: File },
  doc:      { label: 'DOC',  color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  icon: FileText },
  docx:     { label: 'DOCX', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  icon: FileText },
  xls:      { label: 'XLS',  color: '#4ade80', bg: 'rgba(74,222,128,0.15)',  icon: FileSpreadsheet },
  xlsx:     { label: 'XLSX', color: '#4ade80', bg: 'rgba(74,222,128,0.15)',  icon: FileSpreadsheet },
};

function getExt(filename) {
  return filename.includes('.') ? filename.split('.').pop().toLowerCase() : '';
}

function FileBadge({ ext }) {
  const meta = FILE_TYPE_META[ext] || { label: ext.toUpperCase(), color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' };
  return (
    <span style={{
      display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '4px',
      fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.05em',
      color: meta.color, backgroundColor: meta.bg, border: '1px solid ' + meta.color + '40',
    }}>
      {meta.label}
    </span>
  );
}

function DropZone({ onFileSelected }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const validateAndSelect = (file) => {
    const ext = getExt(file.name);
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      alert('Unsupported file format ".' + ext + '".\nSupported: ' + ACCEPTED_EXTENSIONS.join(', '));
      return;
    }
    onFileSelected(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) validateAndSelect(f); }}
      onClick={() => inputRef.current.click()}
      style={{
        border: '2px dashed ' + (dragging ? 'var(--accent)' : 'var(--border)'),
        borderRadius: '12px', padding: '2.5rem 1.5rem', textAlign: 'center', cursor: 'pointer',
        backgroundColor: dragging ? 'var(--accent-light)' : 'var(--bg-inner)',
        transition: 'all 0.2s ease', marginBottom: '1.25rem',
      }}
    >
      <input ref={inputRef} type="file" accept={ACCEPT_ATTR}
        onChange={(e) => { const f = e.target.files[0]; if (f) validateAndSelect(f); e.target.value = ''; }}
        style={{ display: 'none' }}
      />
      <Upload size={32} style={{ color: dragging ? 'var(--accent)' : 'var(--text-muted)', display: 'block', margin: '0 auto 0.75rem' }} />
      <p style={{ fontWeight: '600', marginBottom: '0.4rem', color: dragging ? 'var(--accent)' : 'var(--text-main)' }}>
        {dragging ? 'Drop file here' : 'Drag & drop a file or click to browse'}
      </p>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Supported formats:</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
        {ACCEPTED_EXTENSIONS.map((ext) => <FileBadge key={ext} ext={ext} />)}
      </div>
    </div>
  );
}

function SelectedFilePreview({ file, onRemove }) {
  const ext = getExt(file.name);
  const meta = FILE_TYPE_META[ext] || {};
  const IconComp = meta.icon || File;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem',
      borderRadius: '10px', backgroundColor: 'var(--bg-inner)',
      border: '1px solid var(--border)', marginBottom: '1.25rem',
    }}>
      <IconComp size={22} style={{ color: meta.color || 'var(--text-muted)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{file.name}</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', margin: 0 }}>
          {(file.size / 1024).toFixed(1)} KB · <FileBadge ext={ext} />
        </p>
      </div>
      <button type="button" onClick={onRemove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.25rem', flexShrink: 0 }}>
        <X size={16} />
      </button>
    </div>
  );
}

export default function KnowledgeBase() {
  const [docs, setDocs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [uploadMode, setUploadMode] = useState('file');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Product Docs');
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const fetchDocs = async () => {
    try { const data = await getKnowledgeDocs(); setDocs(data); }
    catch (err) { console.error(err); }
  };

  useEffect(() => { fetchDocs(); }, []);

  const resetForm = () => { setTitle(''); setCategory('Product Docs'); setContent(''); setSelectedFile(null); setUploadResult(null); };

  const handleFileSelected = (file) => {
    setSelectedFile(file);
    setTitle(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
    setUploadResult(null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploading(true); setUploadResult(null);
    try {
      if (uploadMode === 'file' && selectedFile) {
        await uploadKnowledgeFile(selectedFile, category);
      } else {
        if (!title.trim() || !content.trim()) { alert('Please provide both a title and document content.'); setUploading(false); return; }
        await uploadKnowledgeDoc({ title: title.trim(), category, content: content.trim() });
      }
      setUploadResult({ success: true, message: 'Document indexed successfully into the RAG vector store!' });
      fetchDocs(); resetForm();
    } catch (err) {
      setUploadResult({ success: false, message: err.response?.data?.detail || err.message });
    } finally { setUploading(false); }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    setSearching(true);
    try {
      const res = await searchKnowledge(searchQuery);
      setSearchResults(res.results);
    } catch (err) {
      alert('Search failed: ' + err.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div className="header">
        <h1>Company RAG Knowledge Base (pgvector)</h1>
        <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          onClick={() => { setShowModal(!showModal); if (showModal) resetForm(); }}>
          {showModal ? <><X size={16} /> Close</> : <><Plus size={16} /> Add Knowledge Document</>}
        </button>
      </div>

      {showModal && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ marginBottom: '0.3rem' }}>Upload Knowledge Document</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Files are parsed server-side and chunked into pgvector embeddings for RAG retrieval.
              </p>
            </div>
            <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {[{ key: 'file', label: '📁 Upload File' }, { key: 'text', label: '✏️ Paste Text' }].map(({ key, label }) => (
              <button key={key} type="button" onClick={() => { setUploadMode(key); setUploadResult(null); }}
                style={{
                  padding: '0.45rem 1rem', borderRadius: '8px',
                  border: '1px solid ' + (uploadMode === key ? 'var(--accent)' : 'var(--border)'),
                  backgroundColor: uploadMode === key ? 'var(--accent-light)' : 'transparent',
                  color: uploadMode === key ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', transition: 'all 0.15s ease',
                }}>{label}</button>
            ))}
          </div>

          <form onSubmit={handleUpload}>
            {uploadMode === 'file' && (
              <>
                {selectedFile
                  ? <SelectedFilePreview file={selectedFile} onRemove={() => { setSelectedFile(null); setTitle(''); }} />
                  : <DropZone onFileSelected={handleFileSelected} />}
                <div className="form-group">
                  <label>Document Title&nbsp;
                    {selectedFile && <span style={{ color: '#4ade80', fontSize: '0.75rem' }}>· auto-filled from filename</span>}
                  </label>
                  <input className="form-control" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Q4 Pricing Sheet" />
                </div>
              </>
            )}

            {uploadMode === 'text' && (
              <>
                <div className="form-group">
                  <label>Document Title</label>
                  <input className="form-control" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cloud Infrastructure Cost Optimization Whitepaper" />
                </div>
                <div className="form-group">
                  <label>Document Content</label>
                  <textarea className="form-control" required rows="7" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste approved sales copy, FAQ answers, feature descriptions..." />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Category</label>
              <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option>Product Docs</option>
                <option>FAQ &amp; Case Studies</option>
                <option>Pricing &amp; Security</option>
                <option>Company Messaging</option>
                <option>General</option>
              </select>
            </div>

            {uploadResult && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.85rem 1rem',
                borderRadius: '8px', marginBottom: '1rem',
                backgroundColor: uploadResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                border: '1px solid ' + (uploadResult.success ? '#10b98140' : '#ef444440'),
                color: uploadResult.success ? '#34d399' : '#f87171', fontSize: '0.87rem',
              }}>
                {uploadResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {uploadResult.message}
              </div>
            )}

            <button type="submit" className="btn"
              disabled={uploading || (uploadMode === 'file' && !selectedFile)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: (uploading || (uploadMode === 'file' && !selectedFile)) ? 0.6 : 1 }}>
              {uploading
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing &amp; Indexing...</>
                : <><Upload size={16} /> Process &amp; Index Document</>}
            </button>
          </form>
        </div>
      )}

      {/* Vector Similarity Search Test Tool */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3><Search style={{ display: 'inline', marginRight: '0.5rem' }} size={18} /> Test RAG Vector Search</h3>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <input
            className="form-control"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ask a technical or pricing question (e.g. 'What is your SOC2 policy?')"
          />
          <button type="submit" className="btn" disabled={searching}>
            {searching ? 'Searching...' : 'Vector Search'}
          </button>
        </form>

        {searchResults && (
          <div style={{ marginTop: '1.5rem' }}>
            <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Top Matching RAG Chunks:</h4>
            {searchResults.map((r, i) => (
              <div key={i} style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: '600' }}>[{r.category}] {r.title}</div>
                <p style={{ fontSize: '0.9rem', marginTop: '0.4rem' }}>{r.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Indexed Documents Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Document Title</th>
              <th>Category</th>
              <th>Indexed Date</th>
            </tr>
          </thead>
          <tbody>
            {docs.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No knowledge documents indexed yet.
                </td>
              </tr>
            ) : (
              docs.map((d) => (
                <tr key={d.id}>
                  <td>#{d.id}</td>
                  <td style={{ fontWeight: '600' }}>{d.title}</td>
                  <td><span className="badge badge-qualified">{d.category}</span></td>
                  <td>{new Date(d.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
