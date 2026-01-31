'use client'

import { useEffect, useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Archive, ListTodo, PlayCircle, Eye, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import TaskCard from './TaskCard'
import { moveTask, updateTaskAssignee } from '@/app/actions'
import TaskDetails from './TaskDetails'

type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'

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
    task.status = destination.droppableId as TaskStatus
    
    // Find insertion point
    const insertIndex = tasksCopy.findIndex(t => t.status === destination.droppableId) + destination.index
    tasksCopy.splice(insertIndex >= 0 ? insertIndex : tasksCopy.length, 0, task)
    
    setTasks(tasksCopy)

    // Persist to DB
    await moveTask(draggableId, destination.droppableId as TaskStatus, destination.index)
  }

  const getTasksByStatus = (status: string) => {
    return tasks.filter(t => t.status === status)
  }

  const backlogTasks = getTasksByStatus('BACKLOG')

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) => {
      const updated = [...prev]
      const taskIndex = updated.findIndex((t) => t.id === taskId)
      if (taskIndex === -1) return prev

      const [task] = updated.splice(taskIndex, 1)
      task.status = newStatus

      const targetIndex = updated.findIndex((t) => t.status === newStatus)
      updated.splice(targetIndex, 0, task)

      return updated
    })

    await moveTask(taskId, newStatus, 0)
  }

  const handleAssigneeChange = async (taskId: string, assigneeId: string | null) => {
    const assignee = users.find((user) => user.id === assigneeId) ?? null

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              assigneeId: assignee?.id,
              assignee,
            }
          : task
      )
    )

    await updateTaskAssignee(taskId, assigneeId)
  }

  useEffect(() => {
    if (!selectedTask) return
    const updated = tasks.find((t) => t.id === selectedTask.id)
    if (updated) setSelectedTask(updated)
  }, [tasks, selectedTask?.id])

  return (
    <div className="flex flex-col h-full">
      <DragDropContext onDragEnd={onDragEnd}>
        {/* Main Kanban Board */}
        <div className="flex flex-1 min-h-0 gap-4 overflow-x-auto pb-2 snap-x snap-mandatory md:gap-5 md:pb-3 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:snap-none">
          {COLUMNS.map((column) => {
            const columnTasks = getTasksByStatus(column.id)
            const Icon = column.icon
            
            return (
              <div
                key={column.id}
                className="flex flex-col min-h-0 max-h-[700px] w-[260px] flex-shrink-0 snap-start overflow-hidden md:w-[320px] lg:w-auto lg:flex-shrink"
              >
                {/* Column Header */}
                <div className="sticky top-0 z-10 mb-4 flex items-center gap-2  md:mb-5">
                  <Icon className={`w-5 h-5 ${column.color}`} />
                  <h2 className="font-semibold text-sm md:text-base">{column.title}</h2>
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
                      className={`flex-1 min-h-0 rounded-xl p-3 md:p-4 transition-colors overflow-y-auto ${
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
          onStatusChange={(status) => handleStatusChange(selectedTask.id, status)}
          onAssigneeChange={(assigneeId) => handleAssigneeChange(selectedTask.id, assigneeId)}
          onClose={() => setSelectedTask(null)} 
        />
      )}
    </div>
  )
}
