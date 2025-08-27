export async function POST(request) {
  try {
    const data = await request.json();
    
    console.log('Received data:', JSON.stringify(data, null, 2));
    
    // Test validation logic
    const validationResults = {
      hasFromName: !!data.fromName,
      hasFromEmail: !!data.fromEmail,
      hasSmtpHost: !!data.smtpHost,
      hasSmtpUser: !!data.smtpUser,
      hasSmtpPassword: !!data.smtpPassword,
      emailDomain: data.fromEmail ? data.fromEmail.split('@')[1] : null,
      detectedISP: 'other'
    };
    
    // ISP detection
    if (data.fromEmail) {
      const domain = data.fromEmail.split('@')[1];
      if (domain.includes('gmail')) validationResults.detectedISP = 'gmail';
      else if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live')) validationResults.detectedISP = 'outlook';
      else if (domain.includes('yahoo')) validationResults.detectedISP = 'yahoo';
      else if (data.smtpHost && data.smtpHost.includes('secureserver')) validationResults.detectedISP = 'godaddy';
    }
    
    const isValid = validationResults.hasFromName && 
                    validationResults.hasFromEmail && 
                    validationResults.hasSmtpHost && 
                    validationResults.hasSmtpUser && 
                    validationResults.hasSmtpPassword;
    
    return Response.json({
      success: true,
      data: data,
      validation: validationResults,
      isValid: isValid,
      message: isValid ? 'All validations passed' : 'Some validations failed'
    });
    
  } catch (error) {
    console.error('Validation test error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
