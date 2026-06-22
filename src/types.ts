import React from 'react';

export interface QRItem {
  t: string;
  ts: number;
  duplicate?: boolean;
  archived?: boolean;
  nfeData?: any;
  original?: {
    date: string;
    container: string;
    ts: number;
  };
}

export interface ContainerData {
  items: QRItem[];
  finalized?: boolean;
}

export interface DateNode {
  [containerName: string]: ContainerData;
}

export interface CategoryNode {
  [date: string]: DateNode;
}

export interface QRStorage {
  [categoryName: string]: CategoryNode;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  ts: number;
  errorData?: any;
}

export const JfabContainer = ({ children, ...props }: any) => 
  React.createElement('jfab-container', props, children);

export const JfabSidebar = ({ children, ...props }: any) => 
  React.createElement('jfab-sidebar', props, children);

export const JfabNav = ({ children, ...props }: any) => 
  React.createElement('jfab-nav', props, children);

export const JfabMain = ({ children, ...props }: any) => 
  React.createElement('jfab-main', props, children);

export const JfabHeader = ({ children, ...props }: any) => 
  React.createElement('jfab-header', props, children);

export const JfabFooter = ({ children, ...props }: any) => 
  React.createElement('jfab-footer', props, children);
