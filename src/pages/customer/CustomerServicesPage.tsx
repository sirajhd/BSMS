import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { EmptyState } from '../../components/common/EmptyState';
import { servicesApi } from '../../api/services.api';
import type { Service } from '../../types';
import { Scissors, Clock, Search, ArrowRight, Sparkles, Loader2 } from 'lucide-react';

export const CustomerServicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadServices = async () => {
      try {
        const data = await servicesApi.getServices(false); // active only
        if (isMounted) {
          setServices(data || []);
        }
      } catch {
        if (isMounted) {
          setServices([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadServices();
    return () => {
      isMounted = false;
    };
  }, []);

  // Enforce rule: Customers only see active services
  const activeServices = useMemo(() => {
    return services.filter((service: Service) => service.isActive);
  }, [services]);

  // Filter active services by search query
  const filteredServices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return activeServices;
    return activeServices.filter(
      (s: Service) =>
        s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    );
  }, [activeServices, searchQuery]);

  const handleSelectService = (serviceId: string) => {
    navigate(`/customer/book?serviceId=${serviceId}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-100 flex items-center gap-2.5">
            <Scissors className="w-7 h-7 text-amber-500" />
            <span>Service Catalog</span>
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Choose from our premium grooming services, precision cuts, and traditional hot towel treatments.
          </p>
        </div>

        {/* Search Bar */}
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search cuts or treatments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-neutral-400" />}
          />
        </div>
      </div>

      {/* Services Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mr-3" />
          <span>Loading grooming services...</span>
        </div>
      ) : filteredServices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServices.map((service: Service) => (
            <Card
              key={service.id}
              className="flex flex-col justify-between hover:border-neutral-700 transition-all duration-200 group bg-neutral-900/80"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-500 border border-amber-600/20 flex items-center justify-center shrink-0 group-hover:bg-amber-600/20 transition-colors">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700 flex items-center gap-1 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>{service.durationMinutes} mins</span>
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-neutral-100 group-hover:text-amber-400 transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-neutral-800 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Price</span>
                  <span className="text-xl font-black text-amber-500">
                    {service.price} <span className="text-xs font-normal text-neutral-400">ETB</span>
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleSelectService(service.id)}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Book Service
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No Services Found"
          description={
            searchQuery
              ? `No grooming service matched "${searchQuery}". Try a different keyword.`
              : 'There are currently no active services available for booking.'
          }
          icon={<Sparkles className="w-10 h-10 stroke-1 text-neutral-500" />}
          action={
            searchQuery ? (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                Clear Search Filter
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
};