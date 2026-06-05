import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Field } from '../types';
import { fieldApi } from '../services/api';

type FieldContextType = {
  activeField: string;
  setActiveField: (field: string) => void;
  fields: Field[];
  loading: boolean;
  addField: (field: Omit<Field, '_id'>) => Promise<void>;
  removeField: (id: string) => Promise<void>;
};

const FieldContext = createContext<FieldContextType>({
  activeField: '',
  setActiveField: () => {},
  fields: [],
  loading: true,
  addField: async () => {},
  removeField: async () => {},
});

export function FieldProvider({ initialField, children }: {
  initialField?: string;
  children: ReactNode;
}) {
  const [fields, setFields] = useState<Field[]>([]);
  const [activeField, setActiveField] = useState(initialField ?? '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fieldApi.list()
      .then(data => {
        setFields(data);
        if (!activeField && data.length > 0) setActiveField(data[0].name);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addField = async (field: Omit<Field, '_id'>) => {
    const created = await fieldApi.create(field);
    setFields(prev => [...prev, created]);
    if (!activeField) setActiveField(created.name);
  };

  const removeField = async (id: string) => {
    await fieldApi.remove(id);
    setFields(prev => {
      const next = prev.filter(f => f._id !== id);
      const removed = prev.find(f => f._id === id);
      if (removed && activeField === removed.name) {
        setActiveField(next[0]?.name ?? '');
      }
      return next;
    });
  };

  return (
    <FieldContext.Provider value={{ activeField, setActiveField, fields, loading, addField, removeField }}>
      {children}
    </FieldContext.Provider>
  );
}

export const useField = () => useContext(FieldContext);
