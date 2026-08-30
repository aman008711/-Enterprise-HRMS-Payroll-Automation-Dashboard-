import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { 
  FolderLock, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader,
  Upload,
  User,
  Eye,
  Trash2,
  Check,
  X as CloseIcon,
  Download,
  Fingerprint,
  Info,
  Send
} from 'lucide-react';

interface EmployeeType {
  _id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  jobTitle: string;
}

interface DocumentType {
  _id: string;
  employee: EmployeeType;
  title: string;
  category: 'NDA' | 'Employment Contract' | 'Tax Form' | 'Identification' | 'Other';
  status: 'Pending Signature' | 'Signed' | 'Submitted' | 'Approved' | 'Rejected';
  content?: string;
  fileUrl?: string;
  needsSignature: boolean;
  signedAt?: string;
  signatureName?: string;
  signatureIp?: string;
  uploadedBy?: { email: string };
  createdAt: string;
}

const Documents: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdminOrHR = user?.role === 'Admin' || user?.role === 'HR Manager';
  const isEmployee = user?.role === 'Employee';

  // Navigation tab states
  const [activeTab, setActiveTab] = useState<'my-cabinet' | 'all-cabinet' | 'issue-template'>(
    isEmployee ? 'my-cabinet' : 'all-cabinet'
  );

  // Modal dialog states
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<DocumentType | null>(null);

  // Form states for Upload
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<'Tax Form' | 'Identification' | 'Other'>('Tax Form');
  const [uploadFileBase64, setUploadFileBase64] = useState<string>('');
  const [uploadFileName, setUploadFileName] = useState('');

  // Form states for template publishing (Admin only)
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateCategory, setTemplateCategory] = useState<'NDA' | 'Employment Contract'>('NDA');
  const [templateContent, setTemplateContent] = useState('');

  // Form states for signing
  const [signatureName, setSignatureName] = useState('');

  // Notification banners
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Fetch Cabinet Documents
  const { data: documents, isLoading: loadingDocs } = useQuery({
    queryKey: ['cabinet-documents'],
    queryFn: async () => {
      const res = await api.get('/documents');
      return res.data?.data as DocumentType[];
    }
  });

  // 2. Fetch Employees (Admin only)
  const { data: employees } = useQuery({
    queryKey: ['employees-list-docs'],
    queryFn: async () => {
      const res = await api.get('/employees');
      return res.data?.data as EmployeeType[];
    },
    enabled: isAdminOrHR
  });

  // Mutation: Create/Upload Document
  const createDocMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/documents', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet-documents'] });
      setSuccessMsg('Document successfully added to cabinet!');
      setIsUploadModalOpen(false);
      resetForms();
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to add document');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  // Mutation: Sign Document
  const signDocMutation = useMutation({
    mutationFn: async ({ id, signatureName }: { id: string; signatureName: string }) => {
      const res = await api.post(`/documents/${id}/sign`, { signatureName });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet-documents'] });
      setSuccessMsg('Agreement electronically signed successfully!');
      setIsSignModalOpen(false);
      setSignatureName('');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Signature verification failed');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  });

  // Mutation: Approve/Reject Document File
  const verifyDocMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'Approved' | 'Rejected' }) => {
      const res = await api.put(`/documents/${id}/status`, { status });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cabinet-documents'] });
      setSuccessMsg(`Document successfully ${variables.status.toLowerCase()}!`);
      setIsPreviewModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Status update failed');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  // Mutation: Delete Document
  const deleteDocMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/documents/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet-documents'] });
      setSuccessMsg('Document removed from cabinet registry');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to remove document');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  const resetForms = () => {
    setUploadTitle('');
    setUploadCategory('Tax Form');
    setUploadFileBase64('');
    setUploadFileName('');
    setTargetEmployeeId('');
    setTemplateTitle('');
    setTemplateCategory('NDA');
    setTemplateContent('');
    setActiveDoc(null);
  };

  // Convert files to base64 dynamically
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        alert('File size exceeds the 8MB payload limit. Please upload a smaller file.');
        return;
      }
      setUploadFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileBase64) {
      alert('Please select a file to upload');
      return;
    }
    createDocMutation.mutate({
      title: uploadTitle,
      category: uploadCategory,
      fileUrl: uploadFileBase64
    });
  };

  const handleTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDocMutation.mutate({
      employeeId: targetEmployeeId,
      title: templateTitle,
      category: templateCategory,
      content: templateContent,
      needsSignature: true
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this document from the cabinet?')) {
      deleteDocMutation.mutate(id);
    }
  };

  // Filter scoped displays
  const myCabinet = documents || [];
  const allCabinet = documents || [];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <FolderLock className="w-7 h-7 text-brand-400" />
          <h1 className="text-2xl font-black text-white tracking-tight">Secure Document Cabinet</h1>
        </div>

        {/* Upload Trigger */}
        <button
          onClick={() => {
            resetForms();
            setIsUploadModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition duration-200 text-sm cursor-pointer shadow-lg hover:shadow-brand-500/25 select-none"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Success/Error Alerts */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm animate-fade-in">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <p className="font-medium">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Navigation tabs */}
      <div className="flex border-b border-white/10 select-none">
        {isEmployee && (
          <button
            onClick={() => setActiveTab('my-cabinet')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'my-cabinet' 
                ? 'border-brand-500 text-white' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            My Document Cabinet
          </button>
        )}

        {isAdminOrHR && (
          <>
            <button
              onClick={() => setActiveTab('all-cabinet')}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer ${
                activeTab === 'all-cabinet' 
                  ? 'border-brand-500 text-white' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              All Client Folders
            </button>
            <button
              onClick={() => setActiveTab('issue-template')}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer ${
                activeTab === 'issue-template' 
                  ? 'border-brand-500 text-white' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Issue NDA / Contract Sign-off
            </button>
          </>
        )}
      </div>

      {loadingDocs ? (
        <div className="py-12 text-center text-gray-500">
          <Loader className="w-6 h-6 animate-spin text-brand-500 mx-auto" />
        </div>
      ) : activeTab === 'my-cabinet' ? (
        /* TAB 1: Employee Cabinet View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myCabinet.length === 0 ? (
            <div className="col-span-full glass-card p-12 rounded-2xl text-center text-gray-500 font-semibold border border-white/5">
              Cabinet empty. Upload identification or tax forms to submit profiles.
            </div>
          ) : (
            myCabinet.map((doc) => (
              <div key={doc._id} className="glass-card rounded-2xl p-6 border border-white/5 shadow-xl flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">{doc.category}</span>
                    <h3 className="text-md font-bold text-white mt-1 truncate max-w-45">{doc.title}</h3>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                    doc.status === 'Approved' || doc.status === 'Signed' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                    doc.status === 'Pending Signature' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                    doc.status === 'Submitted' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
                    'bg-red-500/15 text-red-400 border-red-500/30'
                  }`}>
                    {doc.status}
                  </span>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/2 border border-white/5 rounded-xl">
                  <FileText className="w-8 h-8 text-gray-400 shrink-0" />
                  <div className="truncate text-xs font-semibold text-gray-300">
                    {doc.needsSignature ? 'E-Signature Template' : 'Uploaded file attachment'}
                    <span className="block text-[10px] text-gray-500 mt-0.5">
                      {new Date(doc.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div>
                    {doc.status !== 'Approved' && doc.status !== 'Signed' && (
                      <button
                        onClick={() => handleDelete(doc._id)}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 rounded-lg border border-red-500/20 transition cursor-pointer"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {doc.status === 'Pending Signature' && (
                      <button
                        onClick={() => {
                          setActiveDoc(doc);
                          setIsSignModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition cursor-pointer select-none"
                      >
                        Sign Contract
                      </button>
                    )}

                    {!doc.needsSignature && doc.fileUrl && (
                      <button
                        onClick={() => {
                          setActiveDoc(doc);
                          setIsPreviewModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-lg text-xs transition cursor-pointer select-none"
                      >
                        View File
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'all-cabinet' ? (
        /* TAB 2: Admin Cabinet Index List */
        <div className="glass-card rounded-2xl border border-white/5 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 select-none">
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Document Title</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Uploaded Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {allCabinet.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500 font-semibold">
                      No documents currently indexed in cabinet storage.
                    </td>
                  </tr>
                ) : (
                  allCabinet.map((doc) => (
                    <tr key={doc._id} className="hover:bg-white/2 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white text-sm">
                          {doc.employee?.firstName} {doc.employee?.lastName}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{doc.employee?.employeeId}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300 font-bold truncate max-w-37.5">{doc.title}</td>
                      <td className="px-6 py-4 text-xs text-gray-400 font-bold">{doc.category}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          doc.status === 'Approved' || doc.status === 'Signed' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                          doc.status === 'Pending Signature' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                          doc.status === 'Submitted' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
                          'bg-red-500/15 text-red-400 border-red-500/30'
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {new Date(doc.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        <button
                          onClick={() => {
                            setActiveDoc(doc);
                            setIsPreviewModalOpen(true);
                          }}
                          className="p-1.5 bg-white/5 hover:bg-white/10 text-brand-400 rounded-lg border border-brand-500/20 transition cursor-pointer"
                          title="Preview Document Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(doc._id)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 rounded-lg border border-red-500/20 transition cursor-pointer"
                          title="Delete document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TAB 3: Admin Template Publishing */
        <div className="glass-card max-w-xl mx-auto rounded-2xl p-6 md:p-8 border border-white/5 shadow-2xl">
          <h2 className="text-lg font-black text-white flex items-center gap-2 mb-6">
            <Fingerprint className="w-5 h-5 text-brand-400" />
            Publish NDA / Employment Contract Template
          </h2>

          <form onSubmit={handleTemplateSubmit} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Target Employee
              </label>
              <select
                required
                value={targetEmployeeId}
                onChange={(e) => setTargetEmployeeId(e.target.value)}
                className="form-input cursor-pointer"
              >
                <option value="" disabled className="bg-slate-900 text-gray-500">Select employee to sign...</option>
                {employees?.map((emp) => (
                  <option key={emp._id} value={emp._id} className="bg-slate-900 text-white">
                    {emp.firstName} {emp.lastName} ({emp.jobTitle})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Document Title</label>
                <input
                  type="text"
                  required
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  placeholder="NDA Contract 2026"
                  className="form-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contract Type</label>
                <select
                  value={templateCategory}
                  onChange={(e: any) => setTemplateCategory(e.target.value)}
                  className="form-input cursor-pointer"
                >
                  <option value="NDA" className="bg-slate-900 text-white">Non-Disclosure Agreement (NDA)</option>
                  <option value="Employment Contract" className="bg-slate-900 text-white">Employment Contract</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contract/NDA Terms (Text)</label>
              <textarea
                required
                rows={6}
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                placeholder="Declare mutual NDA, trade secret parameters, and termination rules..."
                className="form-input"
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
              <button
                type="submit"
                disabled={createDocMutation.isPending}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-sm transition duration-200 cursor-pointer shadow-lg hover:shadow-brand-500/25 select-none"
              >
                {createDocMutation.isPending ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Issue Document Sign-Off
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Modal: Employee Upload File */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fade-in">
          <div className="glass-card rounded-2xl w-full max-w-md p-6 md:p-8 border border-white/10 shadow-2xl space-y-6 relative">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-brand-400" />
              Upload Document file
            </h2>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Document Title</label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Form W-4 / Driver License"
                  className="form-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e: any) => setUploadCategory(e.target.value)}
                  className="form-input cursor-pointer"
                >
                  <option value="Tax Form" className="bg-slate-900 text-white">Tax Declaration Form (e.g. W-4)</option>
                  <option value="Identification" className="bg-slate-900 text-white">Identification Paper (ID / License)</option>
                  <option value="Other" className="bg-slate-900 text-white">Other Certification</option>
                </select>
              </div>

              {/* Native File Selector Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Attach Document file</label>
                <div className="relative border-2 border-dashed border-white/10 hover:border-brand-500/50 rounded-xl p-6 transition text-center cursor-pointer">
                  <input
                    type="file"
                    required
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <span className="block text-xs font-bold text-gray-300">
                    {uploadFileName || 'Click to select PDF or image...'}
                  </span>
                  <span className="block text-[9px] text-gray-500 mt-1">
                    Maximum size: 8MB. File will compile self-contained.
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl text-xs transition cursor-pointer select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDocMutation.isPending || !uploadFileBase64}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-xs transition duration-200 flex items-center gap-1.5 cursor-pointer select-none"
                >
                  {createDocMutation.isPending ? (
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  Upload to Cabinet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Employee Sign Contract template */}
      {isSignModalOpen && activeDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fade-in">
          <div className="glass-card rounded-2xl w-full max-w-2xl p-6 md:p-8 border border-white/10 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div>
              <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">{activeDoc.category}</span>
              <h2 className="text-xl font-black text-white mt-1 flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-brand-400" />
                Sign Corporate Agreement: {activeDoc.title}
              </h2>
            </div>

            {/* Contract Body Render */}
            <div className="bg-slate-950/80 border border-white/5 rounded-xl p-5 text-sm text-gray-300 font-medium leading-relaxed max-h-87.5 overflow-y-auto whitespace-pre-wrap select-text">
              {activeDoc.content}
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              signDocMutation.mutate({ id: activeDoc._id, signatureName });
            }} className="space-y-4 pt-4 border-t border-white/5">
              <div className="p-4 bg-brand-500/5 rounded-xl border border-brand-500/10 flex gap-3 text-xs text-brand-300 font-bold leading-normal">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-brand-400" />
                <p>
                  By typing your legal signature below, you certify under penalty of perjury that you are the employee 
                  account owner and consent to this binding electronic signature.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Type Legal Full Name (e.g. John Doe)
                </label>
                <input
                  type="text"
                  required
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="Must match your employee record legal name"
                  className="form-input font-bold tracking-wide"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsSignModalOpen(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl text-xs transition cursor-pointer select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={signDocMutation.isPending}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition duration-200 flex items-center gap-1.5 cursor-pointer select-none"
                >
                  {signDocMutation.isPending ? (
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Electronically Sign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Document Preview / Approval (Admin/HR) */}
      {isPreviewModalOpen && activeDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fade-in">
          <div className="glass-card rounded-2xl w-full max-w-3xl p-6 md:p-8 border border-white/10 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-start border-b border-white/5 pb-4">
              <div>
                <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">{activeDoc.category}</span>
                <h2 className="text-lg font-black text-white mt-1">{activeDoc.title}</h2>
                <span className="block text-[10px] text-gray-400 mt-1">
                  Employee: {activeDoc.employee?.firstName} {activeDoc.employee?.lastName} (ID: {activeDoc.employee?.employeeId})
                </span>
              </div>
              
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="p-1.5 bg-white/5 hover:bg-white/10 hover:text-white text-gray-400 rounded-lg transition cursor-pointer"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Document Content / File preview body */}
            <div className="space-y-4">
              {activeDoc.needsSignature ? (
                /* E-Signature Audit trail block */
                <div className="space-y-4">
                  <div className="bg-slate-950/80 rounded-xl p-4 border border-white/5 max-h-50 overflow-y-auto text-sm text-gray-300 whitespace-pre-wrap select-text">
                    {activeDoc.content}
                  </div>

                  {activeDoc.status === 'Signed' && (
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/25 rounded-xl space-y-2">
                      <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Fingerprint className="w-4 h-4" /> Secure E-Signature Audit Trail
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-xs font-bold text-gray-300 pt-1">
                        <div>Signee Signature: <span className="text-white italic font-serif">"{activeDoc.signatureName}"</span></div>
                        <div>Signed Date: <span className="text-white">{activeDoc.signedAt ? new Date(activeDoc.signedAt).toLocaleString() : ''}</span></div>
                        <div>Verified IP: <span className="text-white">{activeDoc.signatureIp}</span></div>
                        <div>Verification Status: <span className="text-emerald-400 font-extrabold flex items-center gap-0.5"><Check className="w-3.5 h-3.5" /> LEGALLY BINDING</span></div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Uploaded File Base64 Viewer */
                <div className="space-y-4">
                  {activeDoc.fileUrl ? (
                    <div className="flex flex-col items-center gap-3">
                      {activeDoc.fileUrl.startsWith('data:image/') ? (
                        <div className="border border-white/10 rounded-xl overflow-hidden max-h-100 overflow-y-auto w-full flex justify-center bg-slate-950">
                          <img src={activeDoc.fileUrl} alt={activeDoc.title} className="max-w-full h-auto object-contain" />
                        </div>
                      ) : activeDoc.fileUrl.startsWith('data:application/pdf') ? (
                        <div className="w-full h-100 border border-white/10 rounded-xl overflow-hidden">
                          <iframe src={activeDoc.fileUrl} className="w-full h-full border-none" title="PDF preview" />
                        </div>
                      ) : (
                        <div className="p-8 text-center bg-white/5 border border-white/10 rounded-xl w-full text-gray-400 text-xs font-semibold">
                          File preview is not supported for this type of attachment. Use download button.
                        </div>
                      )}

                      {/* Download link trigger */}
                      <a
                        href={activeDoc.fileUrl}
                        download={activeDoc.title}
                        className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-xs transition duration-200 cursor-pointer select-none shadow-md shadow-brand-500/10"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download File Attachment
                      </a>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 text-sm font-semibold">No file uploaded.</div>
                  )}
                </div>
              )}
            </div>

            {/* Admin Verification status trigger buttons */}
            {isAdminOrHR && !activeDoc.needsSignature && activeDoc.status === 'Submitted' && (
              <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => verifyDocMutation.mutate({ id: activeDoc._id, status: 'Rejected' })}
                  disabled={verifyDocMutation.isPending}
                  className="flex items-center gap-1 px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white font-bold rounded-lg text-xs transition duration-200 cursor-pointer disabled:opacity-50 select-none"
                >
                  <XIcon className="w-3.5 h-3.5" />
                  Reject Document
                </button>
                <button
                  type="button"
                  onClick={() => verifyDocMutation.mutate({ id: activeDoc._id, status: 'Approved' })}
                  disabled={verifyDocMutation.isPending}
                  className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition duration-200 cursor-pointer disabled:opacity-50 select-none shadow-md shadow-emerald-500/10"
                >
                  <Check className="w-3.5 h-3.5" />
                  Approve Document
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const XIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-x w-3.5 h-3.5"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

export default Documents;
