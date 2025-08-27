import dbConnect from '../../../lib/mongodb.js';
import Message from '../../../models/Message.js';
import Campaign from '../../../models/Campaign.js';
import Prospect from '../../../models/Prospect.js';

export async function GET(request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    
    // Build aggregation pipeline to get conversation data
    const pipeline = [
      {
        $lookup: {
          from: 'prospects',
          localField: 'prospectId',
          foreignField: '_id',
          as: 'prospect'
        }
      },
      {
        $lookup: {
          from: 'campaigns',
          localField: 'campaignId',
          foreignField: '_id',
          as: 'campaign'
        }
      },
      {
        $unwind: '$prospect'
      },
      {
        $unwind: '$campaign'
      },
      {
        $group: {
          _id: {
            $concat: [
              { $toString: '$prospectId' },
              '-',
              { $toString: '$campaignId' }
            ]
          },
          conversationId: {
            $concat: [
              { $toString: '$prospectId' },
              '-', 
              { $toString: '$campaignId' }
            ]
          },
          prospect: { $first: '$prospect' },
          campaign: { $first: '$campaign' },
          messages: { $push: '$$ROOT' },
          messageCount: { $sum: 1 },
          lastActivityAt: { $max: '$createdAt' },
          lastActivity: { $last: '$status' },
          currentStep: { $max: '$stepNumber' },
          recentMessage: { $last: '$$ROOT' }
        }
      },
      {
        $project: {
          _id: '$conversationId',
          prospect: 1,
          campaign: 1,
          messageCount: 1,
          lastActivityAt: 1,
          lastActivity: 1,
          currentStep: 1,
          recentMessage: {
            subject: '$recentMessage.subject',
            content: '$recentMessage.content',
            createdAt: '$recentMessage.createdAt',
            status: '$recentMessage.status'
          }
        }
      },
      {
        $sort: { lastActivityAt: -1 }
      }
    ];

    // Apply filter
    if (filter !== 'all') {
      pipeline.splice(-1, 0, {
        $match: { lastActivity: filter }
      });
    }

    const conversations = await Message.aggregate(pipeline);
    
    return Response.json({
      success: true,
      conversations
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
