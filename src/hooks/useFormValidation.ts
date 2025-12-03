import { useState, useCallback } from 'react';

interface ValidationRules {
  [key: string]: {
    required?: boolean;
    message: string;
    customValidation?: (value: any, formData?: any) => boolean;
  };
}

interface UseFormValidationReturn {
  errors: { [key: string]: string };
  validate: (formData: any, rules: ValidationRules) => boolean;
  setError: (field: string, message: string) => void;
  clearError: (field: string) => void;
  clearAllErrors: () => void;
}

export function useFormValidation(): UseFormValidationReturn {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = useCallback((formData: any, rules: ValidationRules): boolean => {
    const newErrors: { [key: string]: string } = {};
    let isValid = true;

    Object.entries(rules).forEach(([field, rule]) => {
      const value = formData[field];

      if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
        newErrors[field] = rule.message;
        isValid = false;
        return;
      }

      if (rule.customValidation && !rule.customValidation(value, formData)) {
        newErrors[field] = rule.message;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, []);

  const setError = useCallback((field: string, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  return { errors, validate, setError, clearError, clearAllErrors };
}
