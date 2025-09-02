'use client';

import { useState, useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';

export default function RichTextEditor({ value, onChange, placeholder, className }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showToolbar, setShowToolbar] = useState(false);
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
    
    onChange(newValue);
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
    const textarea = textareaRef.current;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const lastOpenBrace = textBeforeCursor.lastIndexOf('{');
    
    const beforeBrace = value.substring(0, lastOpenBrace);
    const newValue = beforeBrace + `{{${variableName}}}` + textAfterCursor;
    
    onChange(newValue);
    setShowSuggestions(false);
    
    // Set cursor position after the inserted variable
    setTimeout(() => {
      const newCursorPos = lastOpenBrace + `{{${variableName}}}`.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  const insertVariableAtCursor = (variableName) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = value.substring(0, start);
    const textAfter = value.substring(end);
    const newValue = textBefore + `{{${variableName}}}` + textAfter;
    
    onChange(newValue);
    
    // Set cursor position after the inserted variable
    setTimeout(() => {
      const newCursorPos = start + `{{${variableName}}}`.length;
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
    const lineHeight = 24;
    const charWidth = 8;
    
    return {
      top: (currentLine + 1) * lineHeight,
      left: Math.min(currentColumn * charWidth, 300)
    };
  };

  const formatText = (format) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    if (selectedText) {
      let formattedText = '';
      switch (format) {
        case 'bold':
          formattedText = `**${selectedText}**`;
          break;
        case 'italic':
          formattedText = `*${selectedText}*`;
          break;
        case 'link':
          formattedText = `[${selectedText}](https://example.com)`;
          break;
        default:
          formattedText = selectedText;
      }
      
      const textBefore = value.substring(0, start);
      const textAfter = value.substring(end);
      const newValue = textBefore + formattedText + textAfter;
      
      onChange(newValue);
      
      setTimeout(() => {
        textarea.setSelectionRange(start, start + formattedText.length);
        textarea.focus();
      }, 0);
    }
  };

  return (
    <div className={`${className} relative`}>
      {/* Formatting Toolbar */}
      <div className="border border-gray-200 rounded-t-lg bg-gray-50 px-3 py-2 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => formatText('bold')}
          className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 transition-colors font-bold"
          title="Bold (select text first)"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => formatText('italic')}
          className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 transition-colors italic"
          title="Italic (select text first)"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => formatText('link')}
          className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 transition-colors"
          title="Link (select text first)"
        >
          🔗
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1"></div>
        <span className="text-xs text-gray-500">Type {'{{variable}}'} for variables</span>
      </div>

      {/* Text Area */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[400px] border-t-0 rounded-t-none resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base leading-relaxed"
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        />
        
        {/* Variable Suggestions */}
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
      </div>
      
      {/* Quick Variables */}
      <div className="border border-t-0 border-gray-200 rounded-b-lg bg-gray-50 px-3 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-600">Quick insert:</span>
          {[
            'firstName', 'lastName', 'email', 'company', 'city'
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
