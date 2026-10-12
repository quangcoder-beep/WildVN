"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
}

/**
 * MediaErrorBoundary — High-level error recovery boundary to isolate failures
 * in heavy client-side features (WebGL Canvas, Audio Contexts, interactive maps).
 */
export class MediaErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `MediaErrorBoundary: Error caught in component [${
        this.props.componentName || "Unknown"
      }]:`,
      error,
      errorInfo
    );
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.childrenWithSafety();
  }

  private childrenWithSafety() {
    // If WebGL canvas context creation fails or throws an exception,
    // we want to catch it on render
    try {
      return this.props.children;
    } catch (e) {
      console.error("MediaErrorBoundary: Error during children execution", e);
      return this.props.fallback;
    }
  }
}
