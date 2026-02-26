import { useState } from 'react';
import { api } from '../api';

/**
 * Reusable file upload + list with View, Download, Delete.
 * uploadConfig: { orgId, patientMrn } for patient docs, or { orgId, entityType, entityId } for entity docs.
 */
export default function DocumentList({ documents = [], onRefresh, uploadConfig, setError, title = 'Documents', emptyMessage = 'No documents yet. Upload a file below.' }) {
  const [uploadName, setUploadName] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const isPatient = uploadConfig?.patientMrn != null;
  const isEntity = uploadConfig?.entityType != null && uploadConfig?.entityId != null;

  const fetchList = () => {
    if (!uploadConfig?.orgId) return Promise.resolve();
    if (isPatient) return api.uhpcms.getDocuments({ org_id: uploadConfig.orgId, patient_mrn: uploadConfig.patientMrn });
    if (isEntity) return api.uhpcms.getDocuments({ org_id: uploadConfig.orgId, entity_type: uploadConfig.entityType, entity_id: uploadConfig.entityId });
    return Promise.resolve({ data: [] });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadConfig?.orgId || !uploadName.trim() || !uploadFile) {
      setError?.('Enter a name and choose a file');
      return;
    }
    setUploading(true);
    setError?.('');
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result?.toString().split(',')[1] || '';
          const body = {
            org_id: uploadConfig.orgId,
            name: uploadName.trim(),
            content_type: uploadFile.type || 'application/octet-stream',
            content: base64,
          };
          if (isPatient) body.patient_mrn = uploadConfig.patientMrn;
          if (isEntity) {
            body.entity_type = uploadConfig.entityType;
            body.entity_id = uploadConfig.entityId;
          }
          await api.uhpcms.uploadDocument(body);
          const r = await fetchList();
          onRefresh?.(r.data || []);
          setUploadName('');
          setUploadFile(null);
        } catch (err) {
          setError?.(err.message);
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(uploadFile);
    } catch (err) {
      setError?.(err.message);
      setUploading(false);
    }
  };

  const handleView = async (docId) => {
    try {
      const r = await api.uhpcms.getDocument(docId);
      const d = r.data;
      if (d.content) {
        const blob = new Blob([Uint8Array.from(atob(d.content), (c) => c.charCodeAt(0))], { type: d.content_type || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        window.open(url);
      }
    } catch (err) {
      setError?.(err.message);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const blob = await api.uhpcms.downloadDocument(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name || 'document';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError?.(err.message);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.uhpcms.deleteDocument(docId);
      const r = await fetchList();
      onRefresh?.(r.data || []);
    } catch (err) {
      setError?.(err.message);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>Upload files, then view or download them.</p>
      {(isPatient || isEntity) && (
        <form onSubmit={handleUpload} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <input type="text" placeholder="Document name" value={uploadName} onChange={(e) => setUploadName(e.target.value)} style={{ padding: '0.5rem', minWidth: 200 }} required />
          <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} style={{ padding: '0.5rem' }} />
          <button type="submit" className="btn-primary" disabled={uploading}>{uploading ? 'Uploading…' : 'Upload'}</button>
        </form>
      )}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Name</th><th>Type</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            {documents.length === 0 ? (
              <tr><td colSpan={4} style={{ color: 'var(--color-text-muted)' }}>{emptyMessage}</td></tr>
            ) : (
              documents.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{d.content_type}</td>
                  <td>{d.created_at}</td>
                  <td>
                    <button type="button" className="btn" style={{ marginRight: '0.35rem' }} onClick={() => handleView(d.id)}>View</button>
                    <button type="button" className="btn" style={{ marginRight: '0.35rem' }} onClick={() => handleDownload(d)}>Download</button>
                    <button type="button" className="btn" style={{ color: 'var(--color-danger, #c00)' }} onClick={() => handleDelete(d.id)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
