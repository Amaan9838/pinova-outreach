'use client';

import { useState, useRef, useEffect } from 'react';

export default function SmartTextarea({
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
  const textareaRef = useRef(null);
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
      
      // Check if we're in a variable context (no closing brace after last open brace)
      const textAfterCursor = newValue.substring(cursorPos);
      const nextCloseBrace = textAfterCursor.indexOf('}');
      const hasClosingBrace = nextCloseBrace !== -1;
      
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
    const textarea = textareaRef.current;
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
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  const getSuggestionPosition = () => {
    if (!textareaRef.current) return { top: 0, left: 0 };
    
    const textarea = textareaRef.current;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines.length - 1;
    const currentColumn = lines[currentLine].length;
    
    // Approximate position calculation
    const lineHeight = 20;
    const charWidth = 8;
    
    return {
      top: (currentLine + 1) * lineHeight,
      left: currentColumn * charWidth
    };
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full border-0 resize-none focus:outline-none text-gray-900 ${className}`}
        {...props}
      />
      
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          style={{
            top: getSuggestionPosition().top + 20,
            left: getSuggestionPosition().left,
            minWidth: '200px'
          }}
        >
          <div className="p-2 text-xs text-gray-500 border-b">
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
    </div>
  );
}
