'use client'

import { useEffect, useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Archive, ListTodo, PlayCircle, Eye, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import TaskCard from './TaskCard'
import { moveTask } from '@/app/actions'
import TaskDetails from './TaskDetails'

// Main board columns (without backlog)
const COLUMNS = [
  { id: 'TODO', title: 'To Do', icon: ListTodo, color: 'text-orange-500' },
  { id: 'IN_PROGRESS', title: 'In Progress', icon: PlayCircle, color: 'text-yellow-500' },
  { id: 'REVIEW', title: 'Review', icon: Eye, color: 'text-blue-500' },
  { id: 'DONE', title: 'Done', icon: CheckCircle2, color: 'text-primary' },
]

interface KanbanBoardProps {
  initialTasks: any[]
  users: any[]
  currentUserId: string
}

export default function KanbanBoard({ initialTasks, users, currentUserId }: KanbanBoardProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [backlogExpanded, setBacklogExpanded] = useState(true)

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    // Optimistic update
    const tasksCopy = [...tasks]
    const taskIndex = tasksCopy.findIndex(t => t.id === draggableId)
    const task = tasksCopy[taskIndex]
    
    tasksCopy.splice(taskIndex, 1)
    task.status = destination.droppableId
    
    // Find insertion point
    const destTasks = tasksCopy.filter(t => t.status === destination.droppableId)
    const insertIndex = tasksCopy.findIndex(t => t.status === destination.droppableId) + destination.index
    tasksCopy.splice(insertIndex >= 0 ? insertIndex : tasksCopy.length, 0, task)
    
    setTasks(tasksCopy)

    // Persist to DB
    await moveTask(draggableId, destination.droppableId as any, destination.index)
  }

  const getTasksByStatus = (status: string) => {
    return tasks.filter(t => t.status === status)
  }

  const backlogTasks = getTasksByStatus('BACKLOG')

  useEffect(() => {
    if (!selectedTask) return
    const updated = tasks.find((t) => t.id === selectedTask.id)
    if (updated) setSelectedTask(updated)
  }, [tasks, selectedTask?.id])

  return (
    <div className="flex flex-col h-full">
      <DragDropContext onDragEnd={onDragEnd}>
        {/* Main Kanban Board */}
        <div className="grid grid-cols-4 gap-6 flex-1 min-h-0">
          {COLUMNS.map((column) => {
            const columnTasks = getTasksByStatus(column.id)
            const Icon = column.icon
            
            return (
              <div key={column.id} className="flex flex-col min-h-0">
                {/* Column Header */}
                <div className="flex items-center gap-2 mb-4">
                  <Icon className={`w-5 h-5 ${column.color}`} />
                  <h2 className="font-semibold">{column.title}</h2>
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-card text-xs text-muted-foreground">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 rounded-xl p-3 transition-colors overflow-y-auto ${
                        snapshot.isDraggingOver 
                          ? 'bg-primary/5 border-2 border-dashed border-primary/30' 
                          : 'bg-card/30 border border-border'
                      }`}
                    >
                      <div className="space-y-3">
                        {columnTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={snapshot.isDragging ? 'dragging' : ''}
                              >
                                <TaskCard 
                                  task={task}
                                  onSelect={() => setSelectedTask(task)}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>

                      {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No tasks
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>

        {/* Backlog Section - Horizontal at bottom */}
        <div className="mt-6 border-t border-border pt-4">
          <button
            onClick={() => setBacklogExpanded(!backlogExpanded)}
            className="flex items-center gap-2 mb-3 hover:text-primary transition-colors"
          >
            <Archive className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold">Backlog</h2>
            <span className="px-2 py-0.5 rounded-full bg-card text-xs text-muted-foreground">
              {backlogTasks.length}
            </span>
            {backlogExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground ml-2" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground ml-2" />
            )}
          </button>

          {backlogExpanded && (
            <Droppable droppableId="BACKLOG" direction="horizontal">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`rounded-xl p-3 transition-colors overflow-x-auto ${
                    snapshot.isDraggingOver 
                      ? 'bg-primary/5 border-2 border-dashed border-primary/30' 
                      : 'bg-card/30 border border-border'
                  }`}
                >
                  {backlogTasks.length > 0 ? (
                    <div className="flex gap-4 min-w-max">
                      {backlogTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`w-72 flex-shrink-0 ${snapshot.isDragging ? 'dragging' : ''}`}
                            >
                              <TaskCard 
                                task={task}
                                onSelect={() => setSelectedTask(task)}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No tasks in backlog
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          )}
        </div>
      </DragDropContext>

      {selectedTask && (
        <TaskDetails 
          task={selectedTask} 
          users={users}
          currentUserId={currentUserId}
          onClose={() => setSelectedTask(null)} 
        />
      )}
    </div>
  )
}
