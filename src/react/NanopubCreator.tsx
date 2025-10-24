/**
 * React Component for Nanopub Creator
 * 
 * A React wrapper around the nanopub-create library.
 */

import React, { useEffect, useRef, useState } from 'react';
import NanopubCreator from '../index.js';

interface NanopubCreatorProps {
  templateUri: string;
  onSubmit?: (data: { trigContent: string; formData: any }) => void;
  onChange?: (data: any) => void;
  onError?: (error: { type: string; error?: Error; errors?: string[] }) => void;
  onPublished?: (result: any) => void;
  publishServer?: string;
  autoPublish?: boolean;
  theme?: string;
  validateOnChange?: boolean;
  showHelp?: boolean;
  creator?: string;
  creatorName?: string;
  creatorOrcid?: string;
  className?: string;
}

export const NanopubCreatorComponent: React.FC<NanopubCreatorProps> = ({
  templateUri,
  onSubmit,
  onChange,
  onError,
  onPublished,
  publishServer = 'https://np.petapico.org/',
  autoPublish = false,
  theme = 'default',
  validateOnChange = true,
  showHelp = true,
  creator,
  creatorName,
  creatorOrcid,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const creatorRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !templateUri) return;

    const initCreator = async () => {
      try {
        setLoading(true);
        setError(null);

        // Create creator instance
        const creator = new NanopubCreator({
          publishServer,
          theme,
          validateOnChange,
          showHelp,
          autoPublish,
          creator,
          creatorName,
          creatorOrcid
        });

        // Register event listeners
        if (onSubmit) {
          creator.on('submit', onSubmit);
        }
        if (onChange) {
          creator.on('change', onChange);
        }
        if (onError) {
          creator.on('error', onError);
        }
        if (onPublished) {
          creator.on('published', onPublished);
        }

        // Render form
        await creator.renderFromTemplateUri(templateUri, containerRef.current);
        
        creatorRef.current = creator;
        setLoading(false);
      } catch (err) {
        console.error('Failed to initialize nanopub creator:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
        if (onError) {
          onError({ type: 'initialization', error: err as Error });
        }
      }
    };

    initCreator();

    // Cleanup on unmount
    return () => {
      if (creatorRef.current) {
        creatorRef.current.destroy();
        creatorRef.current = null;
      }
    };
  }, [templateUri, publishServer, theme, validateOnChange, showHelp, autoPublish]);

  if (loading) {
    return (
      <div className={`nanopub-creator-loading ${className}`}>
        <div className="loading-spinner">Loading nanopub creator...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`nanopub-creator-error ${className}`}>
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`nanopub-creator-container ${className}`}
    />
  );
};

// Export both as default and named
export default NanopubCreatorComponent;
