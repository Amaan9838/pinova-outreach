'use client';
import { useRef, useState } from 'react';

export default function LeadKanbanBoard({ leads, stages, heatCfg, onLeadClick, onStageDrop, loading, timeAgo }) {
  const [dragOver, setDragOver] = useState(null);
  const dragRef = useRef(null);

  const grouped = {};
  stages.forEach(s => { grouped[s.id] = []; });
  leads.forEach(l => {
    if (grouped[l.pipelineStage]) grouped[l.pipelineStage].push(l);
    else if (grouped.prospect) grouped.prospect.push(l);
  });

  const handleDragStart = (e, leadId) => {
    dragRef.current = leadId;
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('ld-kb-dragging');
  };

  const handleDragEnd = (e) => {
    dragRef.current = null;
    setDragOver(null);
    e.currentTarget.classList.remove('ld-kb-dragging');
  };

  const handleDragOver = (e, stageId) => {
    e.preventDefault();
    setDragOver(stageId);
  };

  const handleDrop = (e, stageId) => {
    e.preventDefault();
    setDragOver(null);
    if (dragRef.current && onStageDrop) {
      onStageDrop(dragRef.current, stageId);
    }
  };

  if (loading) {
    return (
      <div className="ld-kb-loading">
        {stages.map(s => (
          <div key={s.id} className="ld-kb-col-skeleton">
            <div className="ld-kb-col-header-skel" />
            <div className="ld-kb-card-skel" />
            <div className="ld-kb-card-skel short" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="ld-kanban">
      {stages.map(stage => {
        const items = grouped[stage.id] || [];
        const isOver = dragOver === stage.id;
        return (
          <div
            key={stage.id}
            className={`ld-kb-col ${isOver ? 'ld-kb-drag-over' : ''}`}
            onDragOver={e => handleDragOver(e, stage.id)}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => handleDrop(e, stage.id)}
          >
            <div className="ld-kb-col-header">
              <span className="ld-kb-col-icon">{stage.icon}</span>
              <span className="ld-kb-col-label">{stage.label}</span>
              <span className="ld-kb-col-count">{items.length}</span>
            </div>
            <div className="ld-kb-col-body">
              {items.length === 0 && (
                <div className="ld-kb-empty">No leads</div>
              )}
              {items.map(lead => {
                const heat = heatCfg[lead.heatLevel] || heatCfg.cold;
                const isOverdue = lead.nextAction?.dueDate && new Date(lead.nextAction.dueDate) < new Date();
                return (
                  <div
                    key={lead._id}
                    className={`ld-kb-card ${heat.cls}`}
                    draggable
                    onDragStart={e => handleDragStart(e, lead._id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onLeadClick(lead)}
                  >
                    <div className="ld-kb-card-top">
                      <div className="ld-kb-card-name">{lead.firstName} {lead.lastName}</div>
                      <span className={`ld-kb-heat ${heat.cls}`}>{heat.icon}</span>
                    </div>
                    {lead.company && <div className="ld-kb-card-company">{lead.company}</div>}
                    {lead.nextAction?.type && lead.nextAction.type !== 'none' && (
                      <div className={`ld-kb-card-action ${isOverdue ? 'overdue' : ''}`}>
                        <span className="ld-kb-act-text">{lead.nextAction.description || lead.nextAction.type}</span>
                        {lead.nextAction.dueDate && (
                          <span className="ld-kb-act-date">{timeAgo(lead.nextAction.dueDate)}</span>
                        )}
                      </div>
                    )}
                    <div className="ld-kb-card-footer">
                      <span className="ld-kb-card-owner">{lead.owner}</span>
                      {lead.dealValue > 0 && <span className="ld-kb-card-value">${lead.dealValue.toLocaleString()}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
