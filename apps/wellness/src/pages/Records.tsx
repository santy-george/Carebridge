import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';

type DocumentCategory = 'lab_report' | 'prescription' | 'scan_imaging' | 'other';

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  lab_report: 'Lab report',
  prescription: 'Prescription',
  scan_imaging: 'Scan / imaging',
  other: 'Other',
};

const CATEGORY_CHOICES = Object.keys(CATEGORY_LABELS) as DocumentCategory[];

interface DocumentRow {
  id: string;
  category: DocumentCategory;
  file_name: string;
  storage_path: string;
  created_at: string;
}

// Files up to 10MB -- generous for a scanned prescription photo or a lab PDF,
// small enough to not stall an upload on a weak mobile connection.
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function Records() {
  const { selectedMemberId, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | 'all'>('all');
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('other');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = () => {
    if (!selectedMemberId) return;
    supabase
      .from('documents')
      .select('id, category, file_name, storage_path, created_at')
      .eq('member_id', selectedMemberId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        setLoading(false);
        setFetchError(!!error);
        setDocuments((data as DocumentRow[] | null) ?? []);
      });
  };

  useEffect(loadDocuments, [selectedMemberId]);

  const handleFileChosen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selectedMemberId) return;

    setUploadError(null);
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError('That file is larger than 10MB — try a smaller file or photo.');
      return;
    }

    setUploading(true);
    const path = `${selectedMemberId}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage.from('documents').upload(path, file);
    if (uploadErr) {
      setUploading(false);
      setUploadError("Couldn't upload that file — try again.");
      return;
    }

    const { data, error: insertErr } = await supabase
      .from('documents')
      .insert({
        member_id: selectedMemberId,
        category: uploadCategory,
        file_name: file.name,
        storage_path: path,
        mime_type: file.type || null,
        file_size_bytes: file.size,
        uploaded_by: session?.user.id ?? null,
      })
      .select('id, category, file_name, storage_path, created_at')
      .single();
    setUploading(false);
    if (insertErr || !data) {
      // The file made it to storage but the record row failed -- surface it
      // rather than silently orphaning a file the list will never show.
      setUploadError('File uploaded but could not be saved — try again.');
      return;
    }
    setDocuments((prev) => [data as DocumentRow, ...prev]);
  };

  const viewDocument = async (doc: DocumentRow) => {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.storage_path, 60);
    if (error || !data) {
      setUploadError("Couldn't open that file — try again.");
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const deleteDocument = async (doc: DocumentRow) => {
    setDeletingId(doc.id);
    const { error: storageErr } = await supabase.storage
      .from('documents')
      .remove([doc.storage_path]);
    if (storageErr) {
      setDeletingId(null);
      setUploadError("Couldn't delete that file — try again.");
      return;
    }
    const { error: deleteErr } = await supabase.from('documents').delete().eq('id', doc.id);
    setDeletingId(null);
    if (deleteErr) {
      setUploadError("Couldn't delete that file — try again.");
      return;
    }
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
  };

  if (loading) {
    return <div className="card">Loading…</div>;
  }

  const visibleDocuments =
    categoryFilter === 'all' ? documents : documents.filter((d) => d.category === categoryFilter);

  return (
    <>
      {fetchError && (
        <div className="card" role="alert">
          <span>Something went wrong loading your records.</span>
          <button type="button" onClick={() => setFetchError(false)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="tbar">
        <Link className="backbtn" to="/more" aria-label="Back to more">
          <span className="icon">
            <svg>
              <use href="#i-chevron" />
            </svg>
          </span>
        </Link>
        <div className="tbar__title">
          <h1 className="sm">Records</h1>
        </div>
      </div>

      <div className="field">
        <label>Filter by type</label>
        <div className="choices">
          <button
            type="button"
            className={`choice${categoryFilter === 'all' ? ' on' : ''}`}
            onClick={() => setCategoryFilter('all')}
          >
            All
          </button>
          {CATEGORY_CHOICES.map((c) => (
            <button
              key={c}
              type="button"
              className={`choice${categoryFilter === c ? ' on' : ''}`}
              onClick={() => setCategoryFilter(c)}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      <div className="card card--flush">
        {visibleDocuments.length === 0 && (
          <div style={{ padding: '16px' }}>
            <span className="s">
              {categoryFilter === 'all'
                ? 'No records uploaded yet.'
                : `No ${CATEGORY_LABELS[categoryFilter].toLowerCase()} uploaded yet.`}
            </span>
          </div>
        )}
        {visibleDocuments.map((doc) => (
          <div className="row" key={doc.id}>
            <div className="ic">
              <span className="icon">
                <svg>
                  <use href="#i-document" />
                </svg>
              </span>
            </div>
            <div className="m">
              <div className="t">{doc.file_name}</div>
              <div className="s">
                {CATEGORY_LABELS[doc.category]} · {formatDate(doc.created_at)}
              </div>
            </div>
            <button
              type="button"
              className="iconbtn"
              aria-label={`View ${doc.file_name}`}
              onClick={() => viewDocument(doc)}
            >
              <span className="icon">
                <svg>
                  <use href="#i-eye" />
                </svg>
              </span>
            </button>
            <button
              type="button"
              className="iconbtn"
              aria-label={`Delete ${doc.file_name}`}
              disabled={deletingId === doc.id}
              onClick={() => deleteDocument(doc)}
            >
              <span className="icon">
                <svg>
                  <use href="#i-close" />
                </svg>
              </span>
            </button>
          </div>
        ))}
      </div>

      <div className="field">
        <label>Upload as</label>
        <div className="choices">
          {CATEGORY_CHOICES.map((c) => (
            <button
              key={c}
              type="button"
              className={`choice${uploadCategory === c ? ' on' : ''}`}
              onClick={() => setUploadCategory(c)}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={handleFileChosen}
        aria-hidden="true"
        tabIndex={-1}
      />
      <button
        type="button"
        className="mbtn mbtn--fill mbtn--block"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? 'Uploading…' : 'Upload a photo or file'}
      </button>
      {uploadError && (
        <p className="form-error" role="alert">
          {uploadError}
        </p>
      )}
    </>
  );
}
