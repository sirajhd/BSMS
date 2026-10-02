import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { servicesApi } from '../../api/services.api';
import type { Service } from '../../types';
import {
  Scissors,
  Plus,
  Clock,
  Edit2,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export const AdminServicesPage: React.FC = () => {
  const [servicesList, setServicesList] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [formDuration, setFormDuration] = useState<number | ''>(30);
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchServices = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const data = await servicesApi.getServices(true);
      setServicesList(data || []);
    } catch (err: any) {
      setApiError(err?.message || 'Failed to load services.');
      setServicesList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const openCreateModal = () => {
    setEditingService(null);
    setFormName('');
    setFormDescription('');
    setFormPrice('');
    setFormDuration(30);
    setFormIsActive(true);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setFormName(service.name);
    setFormDescription(service.description);
    setFormPrice(service.price);
    setFormDuration(service.durationMinutes);
    setFormIsActive(service.isActive);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleToggleActive = async (serviceId: string) => {
    try {
      const updated = await servicesApi.toggleServiceStatus(serviceId);
      setServicesList((prev) =>
        prev.map((s) => (s.id === serviceId ? updated : s))
      );
    } catch (err: any) {
      alert(err?.message || 'Failed to toggle service status.');
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formName.trim() || !formDescription.trim() || formPrice === '' || formDuration === '') {
      setErrorMessage('Please fill in all service details.');
      return;
    }

    if (Number(formPrice) <= 0 || Number(formDuration) <= 0) {
      setErrorMessage('Price and duration must be greater than zero.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingService) {
        // Update existing service
        await servicesApi.updateService(editingService.id, {
          name: formName.trim(),
          description: formDescription.trim(),
          price: Number(formPrice),
          durationMinutes: Number(formDuration),
          isActive: formIsActive,
        });
      } else {
        // Create new service
        await servicesApi.createService({
          name: formName.trim(),
          description: formDescription.trim(),
          price: Number(formPrice),
          durationMinutes: Number(formDuration),
          isActive: formIsActive,
        });
      }

      await fetchServices();
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save service.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-100 flex items-center gap-2.5">
            <Scissors className="w-7 h-7 text-amber-500" />
            <span>Services & Pricing Configuration</span>
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Maintain grooming menu items, durations, and official shop pricing in ETB.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={openCreateModal}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add New Service
        </Button>
      </div>

      {apiError && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 flex items-center gap-3 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Services Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500 mr-2" />
          <span>Loading services catalogue...</span>
        </div>
      ) : servicesList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {servicesList.map((service: Service) => (
            <Card
              key={service.id}
              className="border-neutral-800 bg-neutral-900/90 flex flex-col justify-between hover:border-neutral-700 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-500 border border-amber-600/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        service.isActive
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      }`}
                    >
                      {service.isActive ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          <span>Archived</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-neutral-100">{service.name}</h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    {service.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-neutral-300 pt-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Duration: <strong className="text-neutral-100">{service.durationMinutes} mins</strong></span>
                </div>
              </div>

              {/* Price & Action Row */}
              <div className="pt-4 mt-4 border-t border-neutral-800 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Price</span>
                  <span className="text-xl font-black text-amber-500">
                    {service.price} <span className="text-xs font-normal text-neutral-400">ETB</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditModal(service)}
                    leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                  >
                    Edit
                  </Button>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(service.id)}
                    className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                      service.isActive
                        ? 'border-red-900/50 bg-red-950/30 text-red-400 hover:bg-red-950/60'
                        : 'border-emerald-900/50 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-950/60'
                    }`}
                    title={service.isActive ? 'Archive service' : 'Activate service'}
                  >
                    {service.isActive ? (
                      <ToggleRight className="w-4 h-4" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No Services Cataloged"
          description="Create your first haircut or treatment package to make it available for booking."
          icon={<Scissors className="w-10 h-10 stroke-1 text-neutral-500" />}
          action={
            <Button variant="primary" size="sm" onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
              Create First Service
            </Button>
          }
        />
      )}

      {/* CREATE / EDIT SERVICE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? 'Edit Service' : 'Add New Service'}
        description="Configure service catalog details, duration, and price in Ethiopian Birr."
        maxWidth="md"
      >
        <form onSubmit={handleSaveService} className="space-y-4 pt-2">
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-red-950/70 border border-red-800/80 text-red-300 text-xs">
              {errorMessage}
            </div>
          )}

          <Input
            label="Service Title"
            placeholder="e.g. Signature Beard Sculpt"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
          />

          <div>
            <label className="text-xs font-medium text-neutral-300 block mb-1">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Detailed description of what this grooming service entails..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Price (ETB)"
              type="number"
              placeholder="350"
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value === '' ? '' : Number(e.target.value))}
              required
            />

            <Input
              label="Duration (Minutes)"
              type="number"
              placeholder="30"
              value={formDuration}
              onChange={(e) => setFormDuration(e.target.value === '' ? '' : Number(e.target.value))}
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="serviceIsActive"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-neutral-700 bg-neutral-900"
            />
            <label htmlFor="serviceIsActive" className="text-xs text-neutral-300 font-medium cursor-pointer">
              Active and visible to customers on booking wizard
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              leftIcon={<CheckCircle className="w-4 h-4" />}
            >
              {editingService ? 'Save Updates' : 'Publish Service'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};