export async function POST(request) {
  try {
    const data = await request.json();
    
    console.log('=== MAILBOX DEBUG DATA ===');
    console.log('Received data:', JSON.stringify(data, null, 2));
    
    // Check each required field
    const checks = {
      fromName: { value: data.fromName, valid: !!data.fromName },
      fromEmail: { value: data.fromEmail, valid: !!data.fromEmail },
      smtpHost: { value: data.smtpHost, valid: !!data.smtpHost },
      smtpPort: { value: data.smtpPort, valid: !!data.smtpPort },
      smtpUser: { value: data.smtpUser, valid: !!data.smtpUser },
      smtpPassword: { value: data.smtpPassword ? '[HIDDEN]' : null, valid: !!data.smtpPassword },
      smtpSecure: { value: data.smtpSecure, valid: data.smtpSecure !== undefined }
    };
    
    console.log('Field checks:', checks);
    
    return Response.json({
      success: true,
      message: 'Debug data logged to console',
      receivedData: data,
      fieldChecks: checks
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
