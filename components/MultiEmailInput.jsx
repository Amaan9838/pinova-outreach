'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, X, Mail, Star, AlertCircle } from 'lucide-react';

const EMAIL_TYPES = [
  { value: 'work', label: 'Work', icon: '💼' },
  { value: 'personal', label: 'Personal', icon: '👤' },
  { value: 'other', label: 'Other', icon: '📧' }
];

export default function MultiEmailInput({ 
  primaryEmail, 
  additionalEmails = [], 
  onPrimaryEmailChange, 
  onAdditionalEmailsChange,
  className = "",
  disabled = false 
}) {
  const [newEmail, setNewEmail] = useState({ email: '', type: 'work' });
  const [errors, setErrors] = useState({});

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const addEmail = () => {
    const email = newEmail.email.trim();
    
    if (!email) {
      setErrors({ newEmail: 'Email is required' });
      return;
    }

    if (!validateEmail(email)) {
      setErrors({ newEmail: 'Please enter a valid email address' });
      return;
    }

    // Check for duplicates
    const allEmails = [primaryEmail, ...additionalEmails.map(e => e.email)];
    if (allEmails.includes(email)) {
      setErrors({ newEmail: 'This email is already added' });
      return;
    }

    const updatedEmails = [...additionalEmails, {
      email,
      type: newEmail.type,
      isPrimary: false
    }];

    onAdditionalEmailsChange(updatedEmails);
    setNewEmail({ email: '', type: 'work' });
    setErrors({});
  };

  const removeEmail = (index) => {
    const updatedEmails = additionalEmails.filter((_, i) => i !== index);
    onAdditionalEmailsChange(updatedEmails);
  };

  const updateEmailType = (index, type) => {
    const updatedEmails = additionalEmails.map((email, i) => 
      i === index ? { ...email, type } : email
    );
    onAdditionalEmailsChange(updatedEmails);
  };

  const setPrimaryEmail = (email, index) => {
    // Set the selected additional email as primary
    onPrimaryEmailChange(email);
    
    // Move the old primary email to additional emails if it exists
    const updatedEmails = [...additionalEmails];
    if (primaryEmail && primaryEmail.trim()) {
      updatedEmails[index] = { email: primaryEmail, type: 'work', isPrimary: false };
    } else {
      updatedEmails.splice(index, 1);
    }
    
    onAdditionalEmailsChange(updatedEmails);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Primary Email */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Primary Email *
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            type="email"
            value={primaryEmail || ''}
            onChange={(e) => onPrimaryEmailChange(e.target.value)}
            placeholder="john@company.com"
            className="pl-10 border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
            disabled={disabled}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-gray-200">
              <Star className="h-3 w-3 mr-1" />
              Primary
            </Badge>
          </div>
        </div>
        {primaryEmail && !validateEmail(primaryEmail) && (
          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Please enter a valid email address
          </p>
        )}
      </div>

      {/* Additional Emails */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-semibold text-gray-900">
            Additional Emails ({additionalEmails.length})
          </label>
          {additionalEmails.length > 0 && (
            <span className="text-xs text-gray-500">
              Click star to make primary
            </span>
          )}
        </div>

        {/* Existing Additional Emails */}
        <div className="space-y-2 mb-3">
          {additionalEmails.map((emailObj, index) => (
            <Card key={index} className="border border-gray-200 hover:border-gray-300 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setPrimaryEmail(emailObj.email, index)}
                    variant="ghost"
                    size="sm"
                    className="p-1 h-auto text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                    disabled={disabled}
                    title="Set as primary email"
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {emailObj.email}
                    </div>
                  </div>
                  
                  <Select 
                    value={emailObj.type} 
                    onValueChange={(value) => updateEmailType(index, value)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-24 h-8 text-xs border-gray-200 focus:border-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMAIL_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value} className="text-xs">
                          <span className="flex items-center gap-1">
                            <span>{type.icon}</span>
                            {type.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button
                    onClick={() => removeEmail(index)}
                    variant="ghost"
                    size="sm"
                    className="p-1 h-auto text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add New Email */}
        {!disabled && (
          <Card className="border-2 border-dashed border-gray-300 hover:border-gray-500 transition-colors bg-gray-50/50 hover:bg-gray-50">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Input
                    type="email"
                    value={newEmail.email}
                    onChange={(e) => {
                      setNewEmail(prev => ({ ...prev, email: e.target.value }));
                      if (errors.newEmail) setErrors({});
                    }}
                    placeholder="Add another email..."
                    className={`text-sm border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 ${errors.newEmail ? 'border-gray-400' : ''}`}
                  />
                  {errors.newEmail && (
                    <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.newEmail}
                    </p>
                  )}
                </div>
                
                <Select 
                  value={newEmail.type} 
                  onValueChange={(value) => setNewEmail(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger className="w-24 h-9 text-xs border-gray-200 focus:border-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value} className="text-xs">
                        <span className="flex items-center gap-1">
                          <span>{type.icon}</span>
                          {type.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  onClick={addEmail}
                  size="sm"
                  className="bg-gray-900 hover:bg-gray-800 h-9 text-white"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Text */}
        <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
          <Mail className="h-3 w-3 mt-0.5" />
          <span>
            Add multiple email addresses to increase your outreach success rate. 
            The primary email will be used for campaigns by default.
          </span>
        </p>
      </div>
    </div>
  );
}
