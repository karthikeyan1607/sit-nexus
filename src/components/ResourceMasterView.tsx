import React, { useState, useMemo, useRef } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Users, 
  Globe2, 
  Mail, 
  RotateCcw,
  Check,
  AlertCircle,
  ArrowUpDown
} from 'lucide-react';
import { 
  ResourceRecord, 
  ResourceUploadPreview, 
  WorkItemStory 
} from '../types';
import { 
  parseAndValidateResourceFile, 
  downloadResourceMasterTemplate,
  getDynamicRegions
} from '../utils/resourceMaster';
import { normalize } from '../utils/normalize';
import { RegionFlag } from './RegionFlag';

interface ResourceMasterViewProps {
  resources: ResourceRecord[];
  stories: WorkItemStory[];
  onReplaceResources: (newResources: ResourceRecord[]) => void;
  onUpdateResource: (updated: ResourceRecord) => void;
  onDeleteResource: (id: string) => void;
  onAddResource: (newResource: Omit<ResourceRecord, 'id'>) => void;
  onResetToBaseline: () => void;
}

export const ResourceMasterView: React.FC<ResourceMasterViewProps> = ({
  resources,
  stories,
  onReplaceResources,
  onUpdateResource,
  onDeleteResource,
  onAddResource,
  onResetToBaseline,
}) => {
  // Filters, Search & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState('All');
  const [sortField, setSortField] = useState<'name' | 'email' | 'region' | 'status'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Upload & Preview state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<ResourceUploadPreview | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit / Add modal state
  const [editingResource, setEditingResource] = useState<ResourceRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingResource, setDeletingResource] = useState<ResourceRecord | null>(null);

  // New resource form state
  const [newName, setNewName] = useState('');
  const [newRegion, setNewRegion] = useState('India');
  const [newEmail, setNewEmail] = useState('');
  const [formError, setFormError] = useState('');

  // Dynamic regions for filtering & metrics (Section 10)
  const dynamicRegions = useMemo(() => getDynamicRegions(resources), [resources]);

  // Counts by region (null-safe)
  const indiaCount = useMemo(() => resources.filter((r) => normalize(r?.region) === 'india').length, [resources]);
  const europeCount = useMemo(() => resources.filter((r) => normalize(r?.region) === 'europe').length, [resources]);
  const usaCount = useMemo(() => resources.filter((r) => normalize(r?.region) === 'usa').length, [resources]);

  // Handle sort toggle
  const handleSort = (field: 'name' | 'email' | 'region' | 'status') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtered & sorted resources list (null-safe)
  const filteredResources = useMemo(() => {
    let result = resources.filter((r) => {
      if (normalize(selectedRegionFilter) !== 'all' && normalize(r?.region) !== normalize(selectedRegionFilter)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = normalize(searchQuery);
        const matchesName = normalize(r?.name).includes(q);
        const matchesEmail = normalize(r?.email).includes(q);
        const matchesRegion = normalize(r?.region).includes(q);
        if (!matchesName && !matchesEmail && !matchesRegion) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      const valA = normalize(a?.[sortField]);
      const valB = normalize(b?.[sortField]);
      return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    return result;
  }, [resources, selectedRegionFilter, searchQuery, sortField, sortDirection]);

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsUploading(true);
    try {
      const preview = await parseAndValidateResourceFile(file, resources);
      setUploadPreview(preview);
    } catch (err) {
      alert('Failed to parse file: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Confirm replacement (Section 10 & 46)
  const handleConfirmReplacement = () => {
    if (!uploadPreview || uploadPreview.validRecords.length === 0) return;
    onReplaceResources(uploadPreview.validRecords);
    setUploadPreview(null);
  };

  // Save edited resource
  const handleSaveEdit = () => {
    if (!editingResource) return;
    if (!editingResource.name.trim() || !editingResource.region.trim() || !editingResource.email.trim()) {
      alert('Name, Region, and Email are all required.');
      return;
    }
    onUpdateResource(editingResource);
    setEditingResource(null);
  };

  // Save new single resource
  const handleSaveNew = () => {
    if (!newName.trim() || !newRegion.trim() || !newEmail.trim()) {
      setFormError('All fields (Name, Region, Email) are required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      setFormError('Please enter a valid email address.');
      return;
    }

    onAddResource({
      name: newName.trim(),
      region: newRegion.trim(),
      email: newEmail.trim(),
      status: 'Active',
      addedAt: new Date().toISOString(),
    });

    setNewName('');
    setNewRegion('India');
    setNewEmail('');
    setFormError('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto w-full">
      
      {/* Top Banner & Header */}
      <div className="bg-white border border-[#E5E7EB] p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#1C1C1C]" />
            <h2 className="text-lg font-bold text-[#1F2937] tracking-tight font-sans">
              Resource Master
            </h2>
            <span className="text-xs font-mono font-bold text-[#1C1C1C] bg-[#FFCC00] px-2.5 py-0.5 rounded-full">
              {resources.length} Total
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1 max-w-2xl">
            Authoritative resource list without project assignments. Upload CSV/XLSX to replace the Resource Master.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Upload Button (Section 10) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="h-9 flex items-center gap-2 px-3.5 bg-[#FFCD11] hover:bg-[#F2C200] text-[#1C1C1C] font-bold text-xs uppercase rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploading ? 'Processing file...' : 'Upload CSV/XLSX'}</span>
          </button>

          {/* Download Template Button */}
          <button
            type="button"
            onClick={downloadResourceMasterTemplate}
            className="h-9 flex items-center gap-1.5 px-3 bg-white hover:bg-[#F9FAFB] text-[#374151] text-xs font-semibold rounded-lg border border-[#D1D5DB] transition-colors cursor-pointer"
            title="Download template with Name, Region, Mail columns"
          >
            <Download className="w-3.5 h-3.5 text-[#4B5563]" />
            <span>Template</span>
          </button>

          {/* Add Resource Single */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="h-9 flex items-center gap-1.5 px-3 bg-white hover:bg-[#F9FAFB] text-[#374151] text-xs font-semibold rounded-lg border border-[#D1D5DB] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#1C1C1C]" />
            <span>Add Resource</span>
          </button>

          {/* Clear / Reset Resource Master */}
          <button
            type="button"
            onClick={onResetToBaseline}
            className="h-9 px-2.5 text-[#6B7280] hover:text-[#1F2937] bg-white hover:bg-[#F9FAFB] rounded-lg border border-[#D1D5DB] transition-colors cursor-pointer flex items-center justify-center"
            title="Clear / Reset Resource Master"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Region Counts Bar (Section 10: Total, India, Europe, USA count) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => setSelectedRegionFilter('All')}
          className={`p-3.5 rounded-[10px] border transition-all cursor-pointer ${
            selectedRegionFilter === 'All' 
              ? 'bg-[#FEF9C3]/50 border-[#FFCD11] shadow-xs' 
              : 'bg-white border-[#E5E7EB] hover:border-[#D1D5DB]'
          }`}
        >
          <span className="text-[11px] font-mono uppercase text-[#6B7280] font-semibold block">
            Total Resources
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-[#1C1C1C] font-mono">{resources.length}</span>
            <span className="text-[11px] text-[#6B7280] font-mono">100% Active</span>
          </div>
        </div>

        <div 
          onClick={() => setSelectedRegionFilter('India')}
          className={`p-3.5 rounded-[10px] border transition-all cursor-pointer ${
            normalize(selectedRegionFilter) === 'india' 
              ? 'bg-[#FEF9C3]/50 border-[#FFCD11] shadow-xs' 
              : 'bg-white border-[#E5E7EB] hover:border-[#D1D5DB]'
          }`}
        >
          <span className="text-[11px] font-mono uppercase text-[#6B7280] font-semibold flex items-center gap-1.5">
            <RegionFlag region="India" size={14} />
            <span>India Count</span>
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-[#1C1C1C] font-mono">{indiaCount}</span>
            <span className="text-[11px] text-[#6B7280] font-mono">
              {resources.length > 0 ? ((indiaCount / resources.length) * 100).toFixed(0) : 0}%
            </span>
          </div>
        </div>

        <div 
          onClick={() => setSelectedRegionFilter('Europe')}
          className={`p-3.5 rounded-[10px] border transition-all cursor-pointer ${
            normalize(selectedRegionFilter) === 'europe' 
              ? 'bg-[#FEF9C3]/50 border-[#FFCD11] shadow-xs' 
              : 'bg-white border-[#E5E7EB] hover:border-[#D1D5DB]'
          }`}
        >
          <span className="text-[11px] font-mono uppercase text-[#6B7280] font-semibold flex items-center gap-1.5">
            <RegionFlag region="Europe" size={14} />
            <span>Europe Count</span>
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-[#1C1C1C] font-mono">{europeCount}</span>
            <span className="text-[11px] text-[#6B7280] font-mono">
              {resources.length > 0 ? ((europeCount / resources.length) * 100).toFixed(0) : 0}%
            </span>
          </div>
        </div>

        <div 
          onClick={() => setSelectedRegionFilter('USA')}
          className={`p-3.5 rounded-[10px] border transition-all cursor-pointer ${
            normalize(selectedRegionFilter) === 'usa' 
              ? 'bg-[#FEF9C3]/50 border-[#FFCD11] shadow-xs' 
              : 'bg-white border-[#E5E7EB] hover:border-[#D1D5DB]'
          }`}
        >
          <span className="text-[11px] font-mono uppercase text-[#6B7280] font-semibold flex items-center gap-1.5">
            <RegionFlag region="USA" size={14} />
            <span>USA Count</span>
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-[#1C1C1C] font-mono">{usaCount}</span>
            <span className="text-[11px] text-[#6B7280] font-mono">
              {resources.length > 0 ? ((usaCount / resources.length) * 100).toFixed(0) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Search & Region Filter Bar */}
      <div className="bg-white border border-[#E5E7EB] p-3 rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search by name, email, region..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-9 pr-8 bg-[#F9FAFB] border border-[#E5E7EB] text-xs text-[#1F2937] placeholder:text-[#9CA3AF] rounded-lg focus:bg-white focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] outline-none font-sans transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1F2937]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Region Filter Buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setSelectedRegionFilter('All')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              selectedRegionFilter === 'All'
                ? 'bg-[#1C1C1C] text-[#FFCC00]'
                : 'bg-[#F3F4F6] text-[#4B5563] hover:text-[#1F2937]'
            }`}
          >
            All ({resources.length})
          </button>
          {['India', 'Europe', 'USA'].map((region) => (
            <button
              key={region}
              type="button"
              onClick={() => setSelectedRegionFilter(region)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                normalize(selectedRegionFilter) === normalize(region)
                  ? 'bg-[#1C1C1C] text-[#FFCC00]'
                  : 'bg-[#F3F4F6] text-[#4B5563] hover:text-[#1F2937]'
              }`}
            >
              {region} ({region === 'India' ? indiaCount : region === 'Europe' ? europeCount : usaCount})
            </button>
          ))}
        </div>
      </div>

      {/* Resources Table (Section 12: Name, Email, Region, Status - NO project columns) */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#6B7280] font-mono uppercase text-[11px] tracking-wider select-none">
                <th className="py-2.5 px-3.5 font-bold w-12 text-center">#</th>
                <th 
                  className="py-2.5 px-3.5 font-bold cursor-pointer hover:text-[#1F2937]"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    <span>Name</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="py-2.5 px-3.5 font-bold cursor-pointer hover:text-[#1F2937]"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-1">
                    <span>Email</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="py-2.5 px-3.5 font-bold cursor-pointer hover:text-[#1F2937]"
                  onClick={() => handleSort('region')}
                >
                  <div className="flex items-center gap-1">
                    <span>Region</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="py-2.5 px-3.5 font-bold cursor-pointer hover:text-[#1F2937]"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3.5 font-bold text-right w-24">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F1F3F5] font-sans">
              {filteredResources.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6B7280] font-mono">
                  {resources.length === 0 
                    ? 'No resources available. Import Resource Master data or add a resource to populate.' 
                    : `No resources found matching "${searchQuery}".`}
                  </td>
                </tr>
              ) : (
                filteredResources.map((res, index) => (
                  <tr 
                    key={res.id}
                    className="hover:bg-[#F9FAFB] transition-colors"
                  >
                    <td className="py-2 px-3.5 font-mono text-[#9CA3AF] text-center">
                      {index + 1}
                    </td>

                    <td className="py-2 px-3.5 font-semibold text-[#1F2937]">
                      {res.name}
                    </td>

                    <td className="py-2 px-3.5 text-[#4B5563] font-mono text-[11px]">
                      {res.email}
                    </td>

                    <td className="py-2 px-3.5">
                      <span className="font-mono text-xs text-[#374151]">
                        {res.region}
                      </span>
                    </td>

                    <td className="py-2 px-3.5">
                      <span className="inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {res.status || 'Active'}
                      </span>
                    </td>

                    <td className="py-2 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingResource(res)}
                          className="p-1 text-[#6B7280] hover:text-[#1F2937] hover:bg-[#F3F4F6] rounded-lg transition-colors"
                          title="Edit Resource"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingResource(res)}
                          className="p-1 text-[#6B7280] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Resource"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* PREVIEW & VALIDATION MODAL (Section 11)              */}
      {/* ---------------------------------------------------- */}
      {uploadPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="bg-[#1C1C1C] text-white p-4 flex items-center justify-between border-b-2 border-[#FFCC00]">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#FFCC00]" />
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-tight text-white font-sans">
                    Resource Master Validation Preview
                  </h3>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    File: {uploadedFileName || 'Uploaded Resource File'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setUploadPreview(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto text-xs">
              
              {/* Stats Summary (Section 11: File Name, Total Rows, Valid Rows, Invalid Rows, Duplicates) */}
              <div className="grid grid-cols-4 gap-2 bg-[#F9FAFB] p-3 rounded-[10px] border border-[#E5E7EB] text-center font-mono">
                <div>
                  <span className="text-[10px] text-[#6B7280] uppercase block">Total Rows</span>
                  <span className="text-lg font-bold text-[#1F2937]">
                    {uploadPreview.validRecords.length + uploadPreview.errors.length}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 uppercase block">Valid Rows</span>
                  <span className="text-lg font-bold text-emerald-700">
                    {uploadPreview.validRecords.length}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-red-600 uppercase block">Invalid Rows</span>
                  <span className={`text-lg font-bold ${uploadPreview.errors.length > 0 ? 'text-red-600' : 'text-[#6B7280]'}`}>
                    {uploadPreview.errors.length}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-amber-700 uppercase block">Duplicates</span>
                  <span className={`text-lg font-bold ${uploadPreview.duplicateNames.length > 0 ? 'text-amber-700' : 'text-[#6B7280]'}`}>
                    {uploadPreview.duplicateNames.length}
                  </span>
                </div>
              </div>

              {/* Replacement Warning */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-[10px] text-amber-900 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Replacement Notice:</strong> Uploading a new Resource Master replaces the existing Resource Master ({uploadPreview.currentCount} active $\rightarrow$ {uploadPreview.validRecords.length} new). Data is not merged.
                </p>
              </div>

              {/* Validation Errors Table (Section 11: Display invalid rows clearly) */}
              {uploadPreview.errors.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] uppercase font-bold text-red-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Critical Validation Errors ({uploadPreview.errors.length})</span>
                  </span>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-36 overflow-y-auto divide-y divide-red-200/60 font-mono text-[11px]">
                    {uploadPreview.errors.map((err, i) => (
                      <div key={i} className="py-1 text-red-800 flex items-center justify-between">
                        <span>Row {err.row}: {err.message}</span>
                        {err.field && <span className="text-red-600">[{err.field}]</span>}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-red-700 italic">
                    Cannot confirm replacement while critical validation errors exist. Please correct the rows in your spreadsheet and upload again.
                  </p>
                </div>
              )}

              {/* Preview of Valid Records */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase text-[#374151]">
                  Preview of Valid Rows ({uploadPreview.validRecords.length})
                </span>
                <div className="border border-[#E5E7EB] rounded-lg max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#F9FAFB] text-[#6B7280] font-mono border-b border-[#E5E7EB] sticky top-0">
                      <tr>
                        <th className="p-2">Name</th>
                        <th className="p-2">Region</th>
                        <th className="p-2">Mail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F3F5] font-sans">
                      {uploadPreview.validRecords.slice(0, 10).map((r, i) => (
                        <tr key={i} className="hover:bg-[#F9FAFB]">
                          <td className="p-2 font-semibold text-[#1F2937]">{r.name}</td>
                          <td className="p-2 text-[#4B5563]">{r.region}</td>
                          <td className="p-2 text-[#6B7280] font-mono">{r.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {uploadPreview.validRecords.length > 10 && (
                    <div className="p-2 text-center text-[#6B7280] text-[10px] font-mono bg-[#F9FAFB] border-t border-[#E5E7EB]">
                      + {uploadPreview.validRecords.length - 10} more valid records
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="bg-[#F9FAFB] p-4 border-t border-[#E5E7EB] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setUploadPreview(null)}
                className="px-3.5 py-1.5 text-xs text-[#6B7280] hover:text-[#1F2937] font-semibold rounded-lg"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmReplacement}
                disabled={uploadPreview.validRecords.length === 0 || uploadPreview.errors.length > 0}
                className="flex items-center gap-2 px-5 py-2 bg-[#FFCC00] hover:bg-[#F2C200] disabled:opacity-40 text-[#1C1C1C] font-bold uppercase text-xs rounded-lg transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Replace Resource Master</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Edit Single Resource Modal */}
      {editingResource && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xl max-w-md w-full p-5 text-xs flex flex-col gap-4">
            <h3 className="font-bold text-sm text-[#1F2937]">Edit Resource</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Name</label>
                <input
                  type="text"
                  value={editingResource.name}
                  onChange={(e) => setEditingResource({ ...editingResource, name: e.target.value })}
                  className="w-full h-8 px-2.5 bg-white border border-[#D1D5DB] rounded-lg text-xs text-[#1F2937] outline-none focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] transition-all"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Email</label>
                <input
                  type="email"
                  value={editingResource.email}
                  onChange={(e) => setEditingResource({ ...editingResource, email: e.target.value })}
                  className="w-full h-8 px-2.5 bg-white border border-[#D1D5DB] rounded-lg text-xs text-[#1F2937] outline-none focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] transition-all"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Region</label>
                <select
                  value={editingResource.region}
                  onChange={(e) => setEditingResource({ ...editingResource, region: e.target.value })}
                  className="w-full h-8 px-2.5 bg-white border border-[#D1D5DB] rounded-lg text-xs text-[#1F2937] outline-none"
                >
                  <option value="India">India</option>
                  <option value="Europe">Europe</option>
                  <option value="USA">USA</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setEditingResource(null)}
                className="px-3 py-1.5 text-xs text-[#6B7280] hover:text-[#1F2937] rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-1.5 bg-[#FFCC00] hover:bg-[#F2C200] text-[#1C1C1C] font-bold text-xs rounded-lg uppercase"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Single Resource Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xl max-w-md w-full p-5 text-xs flex flex-col gap-4">
            <h3 className="font-bold text-sm text-[#1F2937]">Add New Resource</h3>
            {formError && (
              <div className="p-2 bg-red-50 text-red-700 rounded-lg text-[11px]">{formError}</div>
            )}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Name</label>
                <input
                  type="text"
                  placeholder="Resource Full Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-[#D1D5DB] rounded-lg text-xs text-[#1F2937] outline-none focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] transition-all"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Email</label>
                <input
                  type="email"
                  placeholder="corporate.email@cat.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-[#D1D5DB] rounded-lg text-xs text-[#1F2937] outline-none focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] transition-all"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Region</label>
                <select
                  value={newRegion}
                  onChange={(e) => setNewRegion(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-[#D1D5DB] rounded-lg text-xs text-[#1F2937] outline-none"
                >
                  <option value="India">India</option>
                  <option value="Europe">Europe</option>
                  <option value="USA">USA</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#6B7280] hover:text-[#1F2937] rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNew}
                className="px-4 py-1.5 bg-[#FFCC00] hover:bg-[#F2C200] text-[#1C1C1C] font-bold text-xs rounded-lg uppercase"
              >
                Add Resource
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingResource && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xl max-w-sm w-full p-5 text-xs flex flex-col gap-3">
            <h3 className="font-bold text-sm text-[#1F2937]">Delete Resource</h3>
            <p className="text-[#6B7280]">
              Are you sure you want to remove <strong>{deletingResource.name}</strong> from the Resource Master?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setDeletingResource(null)}
                className="px-3 py-1.5 text-xs text-[#6B7280] hover:text-[#1F2937] rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteResource(deletingResource.id);
                  setDeletingResource(null);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg uppercase"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
