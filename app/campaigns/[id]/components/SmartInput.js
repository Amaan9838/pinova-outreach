'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

export default function SmartInput({
  value,
  onChange,
  placeholder,
  className = '',
  ...props
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const defaultVariables = [
    'firstName', 'lastName', 'email', 'company', 'phone', 'website', 
    'industry', 'position', 'city', 'country', 'linkedinUrl'
  ];

  const [customVariables, setCustomVariables] = useState([]);

  useEffect(() => {
    // Load custom variables from localStorage
    try {
      const saved = localStorage.getItem('email_variables');
      if (saved) {
        const parsed = JSON.parse(saved);
        setCustomVariables(parsed.map(v => v.name));
      }
    } catch (error) {
      console.error('Error loading variables:', error);
    }
  }, []);

  const allVariables = [...defaultVariables, ...customVariables];

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(e);
    setCursorPosition(cursorPos);

    // Check if user typed '{'
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastOpenBrace = textBeforeCursor.lastIndexOf('{');
    
    if (lastOpenBrace !== -1) {
      const textAfterBrace = textBeforeCursor.substring(lastOpenBrace + 1);
      
      // Check if we're in a variable context
      const textAfterCursor = newValue.substring(cursorPos);
      
      if (!textAfterBrace.includes('}') && textAfterBrace.length >= 0) {
        // Filter variables based on what user has typed
        const filtered = allVariables.filter(variable =>
          variable.toLowerCase().includes(textAfterBrace.toLowerCase())
        );
        
        if (filtered.length > 0) {
          setSuggestions(filtered);
          setShowSuggestions(true);
          setSelectedIndex(0);
        } else {
          setShowSuggestions(false);
        }
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        insertVariable(suggestions[selectedIndex]);
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const insertVariable = (variableName) => {
    const input = inputRef.current;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const lastOpenBrace = textBeforeCursor.lastIndexOf('{');
    
    const beforeBrace = value.substring(0, lastOpenBrace);
    const newValue = beforeBrace + `{{${variableName}}}` + textAfterCursor;
    
    // Create synthetic event
    const syntheticEvent = {
      target: { value: newValue }
    };
    
    onChange(syntheticEvent);
    setShowSuggestions(false);
    
    // Set cursor position after the inserted variable
    setTimeout(() => {
      const newCursorPos = lastOpenBrace + `{{${variableName}}}`.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
      input.focus();
    }, 0);
  };

  const insertVariableAtCursor = (variableName) => {
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const textBefore = value.substring(0, start);
    const textAfter = value.substring(end);
    const newValue = textBefore + `{{${variableName}}}` + textAfter;
    
    // Create synthetic event
    const syntheticEvent = {
      target: { value: newValue }
    };
    
    onChange(syntheticEvent);
    
    // Set cursor position after the inserted variable
    setTimeout(() => {
      const newCursorPos = start + `{{${variableName}}}`.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
      input.focus();
    }, 0);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`${className} pr-20`}
          {...props}
        />
        
        {/* Quick variable button */}
        <button
          type="button"
          onClick={() => {
            const commonVars = ['firstName', 'lastName', 'company'];
            const randomVar = commonVars[Math.floor(Math.random() * commonVars.length)];
            insertVariableAtCursor(randomVar);
          }}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800 font-medium"
          title="Insert variable"
        >
          {'{x}'}
        </button>
      </div>
      
      {/* Variable Suggestions */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1 w-full"
        >
          <div className="p-2 text-xs text-gray-500 border-b bg-gray-50">
            Variables (use ↑↓ to navigate, Enter to select)
          </div>
          {suggestions.map((variable, index) => (
            <div
              key={variable}
              className={`px-3 py-2 cursor-pointer text-sm ${
                index === selectedIndex
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => insertVariable(variable)}
            >
              <div className="font-medium">{`{{${variable}}}`}</div>
            </div>
          ))}
        </div>
      )}
      
      {/* Quick Variables */}
      <div className="mt-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-600">Quick:</span>
          {[
            'firstName', 'lastName', 'company'
          ].map((variable) => (
            <button
              key={variable}
              type="button"
              onClick={() => insertVariableAtCursor(variable)}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors border border-blue-200"
            >
              {`{{${variable}}}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
