import mongoose from 'mongoose';

/**
 * EmailFlow Schema
 * Per-campaign flow instance that executes the email sequence logic
 * Can be created from a FlowTemplate or built from scratch
 */

// Node schema (same structure as FlowTemplate but campaign-specific)
const FlowNodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ['email', 'wait', 'condition', 'categorize', 'action', 'start', 'end'],
    required: true
  },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  label: { type: String },
  style: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

// Edge schema
const FlowEdgeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  sourceHandle: { type: String },
  targetHandle: { type: String },
  label: { type: String },
  type: { type: String, default: 'smoothstep' },
  animated: { type: Boolean, default: false },
  style: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const EmailFlowSchema = new mongoose.Schema({
  // Flow identity
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  // Campaign reference
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
    index: true,
    unique: true // One flow per campaign
  },
  
  // Template reference (if created from template)
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FlowTemplate'
  },
  
  // React Flow structure
  nodes: [FlowNodeSchema],
  edges: [FlowEdgeSchema],
  
  // Entry point
  startNodeId: {
    type: String,
    required: true
  },
  
  // Viewport settings
  viewport: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    zoom: { type: Number, default: 1 }
  },
  
  // Flow status
  isActive: {
    type: Boolean,
    default: false
  },
  
  // Analytics per node
  nodeStats: {
    type: Map,
    of: new mongoose.Schema({
      executed: { type: Number, default: 0 },
      successful: { type: Number, default: 0 },
      failed: { type: Number, default: 0 }
    }, { _id: false }),
    default: new Map()
  },
  
  // Edge analytics (which paths are most traveled)
  edgeStats: {
    type: Map,
    of: new mongoose.Schema({
      traversed: { type: Number, default: 0 }
    }, { _id: false }),
    default: new Map()
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastExecutedAt: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'emailflows'
});

// Indexes
// Note: campaign index is auto-created by index:true/unique:true on the campaign field
EmailFlowSchema.index({ isActive: 1 });

// Pre-save validation
EmailFlowSchema.pre('save', function(next) {
  // Validate startNodeId exists
  if (this.startNodeId && this.nodes.length > 0) {
    const startNode = this.nodes.find(n => n.id === this.startNodeId);
    if (!startNode) {
      return next(new Error('startNodeId must reference an existing node'));
    }
  }
  next();
});

// Instance method: Get node by ID
EmailFlowSchema.methods.getNode = function(nodeId) {
  return this.nodes.find(n => n.id === nodeId);
};

// Instance method: Get outgoing edges from a node
EmailFlowSchema.methods.getOutgoingEdges = function(nodeId) {
  return this.edges.filter(e => e.source === nodeId);
};

// Instance method: Get incoming edges to a node
EmailFlowSchema.methods.getIncomingEdges = function(nodeId) {
  return this.edges.filter(e => e.target === nodeId);
};

// Instance method: Find next node based on condition
EmailFlowSchema.methods.findNextNode = function(currentNodeId, sourceHandle = null) {
  const edges = this.getOutgoingEdges(currentNodeId);
  
  if (sourceHandle) {
    // Find edge matching the specific handle (for condition nodes)
    const matchingEdge = edges.find(e => e.sourceHandle === sourceHandle);
    if (matchingEdge) {
      return this.getNode(matchingEdge.target);
    }
  }
  
  // Default: return first outgoing edge target
  if (edges.length > 0) {
    return this.getNode(edges[0].target);
  }
  
  return null;
};

// Instance method: Record node execution
EmailFlowSchema.methods.recordNodeExecution = async function(nodeId, success = true) {
  const stats = this.nodeStats.get(nodeId) || { executed: 0, successful: 0, failed: 0 };
  stats.executed++;
  if (success) {
    stats.successful++;
  } else {
    stats.failed++;
  }
  this.nodeStats.set(nodeId, stats);
  this.lastExecutedAt = new Date();
  await this.save();
};

// Instance method: Record edge traversal
EmailFlowSchema.methods.recordEdgeTraversal = async function(edgeId) {
  const stats = this.edgeStats.get(edgeId) || { traversed: 0 };
  stats.traversed++;
  this.edgeStats.set(edgeId, stats);
  await this.save();
};

// Instance method: Get flow analytics
EmailFlowSchema.methods.getAnalytics = function() {
  const analytics = {
    totalNodes: this.nodes.length,
    totalEdges: this.edges.length,
    nodesByType: {},
    topPerformingNodes: [],
    pathAnalysis: []
  };
  
  // Count nodes by type
  for (const node of this.nodes) {
    analytics.nodesByType[node.type] = (analytics.nodesByType[node.type] || 0) + 1;
  }
  
  // Get top performing nodes
  const nodeStatsArray = [];
  this.nodeStats.forEach((stats, nodeId) => {
    const node = this.getNode(nodeId);
    nodeStatsArray.push({
      nodeId,
      nodeType: node?.type,
      ...stats
    });
  });
  analytics.topPerformingNodes = nodeStatsArray.sort((a, b) => b.executed - a.executed).slice(0, 5);
  
  return analytics;
};

// Static method: Create flow from template
EmailFlowSchema.statics.createFromTemplate = async function(templateId, campaignId) {
  const FlowTemplate = mongoose.model('FlowTemplate');
  const template = await FlowTemplate.findById(templateId);
  
  if (!template) {
    throw new Error('Template not found');
  }
  
  // Clone template for campaign
  const flowData = template.cloneForCampaign(campaignId);
  
  return this.create(flowData);
};

// Static method: Get flow for campaign
EmailFlowSchema.statics.getForCampaign = async function(campaignId) {
  return this.findOne({ campaign: campaignId });
};

export default mongoose.models.EmailFlow || mongoose.model('EmailFlow', EmailFlowSchema);
