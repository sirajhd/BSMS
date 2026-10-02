import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  header,
  footer,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 shadow-sm text-neutral-100 ${className}`}
      {...props}
    >
      {header && <div className="border-b border-neutral-800/80 pb-3 mb-4">{header}</div>}
      <div>{children}</div>
      {footer && <div className="border-t border-neutral-800/80 pt-3 mt-4">{footer}</div>}
    </div>
  );
};