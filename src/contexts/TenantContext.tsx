import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Tenant, TenantSettings } from '../types';
import { tenantApi } from '../api/tenant.api';
import { getClientTenantSlug } from '../api/client';

interface TenantContextType {
  tenant: Tenant | null;
  settings: TenantSettings | null;
  tenantSlug: string | null;
  isLoadingTenant: boolean;
  tenantError: string | null;
  refreshTenant: () => Promise<void>;
  setTenantSlug: (slug: string) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const TENANT_STORAGE_KEY = 'bsms_active_tenant_slug';

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantSlug, setTenantSlugState] = useState<string | null>(getClientTenantSlug());
  const [isLoadingTenant, setIsLoadingTenant] = useState<boolean>(true);
  const [tenantError, setTenantError] = useState<string | null>(null);

  const fetchTenant = async () => {
    setIsLoadingTenant(true);
    setTenantError(null);

    try {
      const data = await tenantApi.getCurrentTenant();
      setTenant(data);

      // Update page document title to the tenant's brand name
      if (data.name) {
        document.title = `${data.name} — BSMS SaaS`;
      }

      // Dynamically apply primary branding color css custom property
      if (data.settings?.primaryColor) {
        document.documentElement.style.setProperty('--tenant-primary', data.settings.primaryColor);
      }
    } catch (err: any) {
      setTenantError(err.message || 'Unable to load tenant branding');
    } finally {
      setIsLoadingTenant(false);
    }
  };

  useEffect(() => {
    fetchTenant();
  }, [tenantSlug]);

  const setTenantSlug = (slug: string) => {
    if (slug) {
      localStorage.setItem(TENANT_STORAGE_KEY, slug);
    } else {
      localStorage.removeItem(TENANT_STORAGE_KEY);
    }
    setTenantSlugState(slug || null);
  };

  const refreshTenant = async () => {
    await fetchTenant();
  };

  return (
    <TenantContext.Provider
      value={{
        tenant,
        settings: tenant?.settings || null,
        tenantSlug,
        isLoadingTenant,
        tenantError,
        refreshTenant,
        setTenantSlug,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
