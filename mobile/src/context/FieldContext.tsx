import React, { createContext, useContext, useState, ReactNode } from 'react';
import { mockFields } from '../constants/mockData';

type Field = { name: string; icon: string };

type FieldContextType = {
  activeField: string;
  setActiveField: (field: string) => void;
  fields: Field[];
  addField: (field: Field) => void;
  removeField: (name: string) => void;
};

const FieldContext = createContext<FieldContextType>({
  activeField: mockFields[0]?.name ?? '',
  setActiveField: () => {},
  fields: mockFields,
  addField: () => {},
  removeField: () => {},
});

export function FieldProvider({ initialField, children }: {
  initialField?: string;
  children: ReactNode;
}) {
  const [fields, setFields] = useState<Field[]>(mockFields);
  const [activeField, setActiveField] = useState(initialField ?? mockFields[0]?.name ?? '');

  const addField = (field: Field) => {
    setFields(prev => [...prev, field]);
  };

  const removeField = (name: string) => {
    setFields(prev => {
      const next = prev.filter(f => f.name !== name);
      if (activeField === name) setActiveField(next[0]?.name ?? '');
      return next;
    });
  };

  return (
    <FieldContext.Provider value={{ activeField, setActiveField, fields, addField, removeField }}>
      {children}
    </FieldContext.Provider>
  );
}

export const useField = () => useContext(FieldContext);
