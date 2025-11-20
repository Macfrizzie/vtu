
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import type { FirestorePermissionError } from '@/lib/firebase/errors';
import { useToast } from './ui/use-toast';

/**
 * This component listens for Firestore permission errors and displays them
 * in a toast notification to provide immediate feedback during development.
 * This should be placed in a root layout.
 */
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      console.error("Caught Firestore Permission Error:", error);

      // In a real development environment, you would throw the error
      // to make it visible in the Next.js error overlay.
      // For this environment, we'll use a toast to make it visible.
       toast({
        variant: 'destructive',
        title: 'Firestore Permission Error',
        description: (
          <pre className="mt-2 w-full rounded-md bg-slate-950 p-4">
            <code className="text-white">{error.message}</code>
          </pre>
        ),
        duration: 30000,
      });

      // This is the line that would typically show the error overlay in Next.js
      // throw error;
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null; // This component does not render anything
}
