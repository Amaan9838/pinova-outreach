import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ReplyCategory from '@/models/ReplyCategory';
import FlowTemplate from '@/models/FlowTemplate';

/**
 * GET /api/flow/categories
 * Get all reply categories for the user (system defaults + custom)
 */
export async function GET(request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    // Get system categories + user categories
    const categories = await ReplyCategory.find({
      $or: [
        { isSystem: true },
        { userId: userId }
      ]
    }).sort({ priority: 1, name: 1 });
    
    return NextResponse.json({
      success: true,
      data: categories
    });
    
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/flow/categories
 * Create a custom category or initialize system defaults
 */
export async function POST(request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { action, category, userId } = body;
    
    // Initialize system defaults
    if (action === 'initialize_defaults') {
      await ReplyCategory.initializeDefaults();
      
      const categories = await ReplyCategory.getSystemDefaults();
      return NextResponse.json({
        success: true,
        message: 'System defaults initialized',
        data: categories
      });
    }
    
    // Create custom category
    if (action === 'create' && category) {
      const newCategory = await ReplyCategory.create({
        ...category,
        isSystem: false,
        userId: userId
      });
      
      return NextResponse.json({
        success: true,
        data: newCategory
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Error with categories:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/flow/categories
 * Update a category
 */
export async function PUT(request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { categoryId, updates, userId } = body;
    
    // Find the category
    const category = await ReplyCategory.findById(categoryId);
    
    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }
    
    // Don't allow editing system categories (except response templates)
    if (category.isSystem) {
      // Allow updating response template only for system categories
      if (updates.responseTemplate) {
        category.responseTemplate = {
          ...category.responseTemplate,
          ...updates.responseTemplate
        };
        await category.save();
        
        return NextResponse.json({
          success: true,
          data: category
        });
      }
      
      return NextResponse.json(
        { success: false, error: 'Cannot modify system category properties' },
        { status: 403 }
      );
    }
    
    // Update custom category
    Object.assign(category, updates);
    await category.save();
    
    return NextResponse.json({
      success: true,
      data: category
    });
    
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/flow/categories
 * Delete a custom category
 */
export async function DELETE(request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    
    const category = await ReplyCategory.findById(categoryId);
    
    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }
    
    if (category.isSystem) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete system category' },
        { status: 403 }
      );
    }
    
    await ReplyCategory.findByIdAndDelete(categoryId);
    
    return NextResponse.json({
      success: true,
      message: 'Category deleted'
    });
    
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
