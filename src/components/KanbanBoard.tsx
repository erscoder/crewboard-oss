'use client'

import { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Archive, PlayCircle, Eye, CheckCircle2 } from 'lucide-react'
import TaskCard from './TaskCard'
import { moveTask } from '@/app/actions'

const COLUMNS = [
  { id: 'BACKLOG', title: 'Backlog', icon: Archive, color: 'text-muted-foreground' },
  { id: 'IN_PROGRESS', title: 'In Progress', icon: PlayCircle, color: 'text-yellow-500' },
  { id: 'REVIEW', title: 'Review', icon: Eye, color: 'text-blue-500' },
  { id: 'DONE', title: 'Done', icon: CheckCircle2, color: 'text-primary' },
]

interface KanbanBoardProps {
  initialTasks: any[]
  projects: any[]
  users: any[]
}

export default function KanbanBoard({ initialTasks, projects, users }: KanbanBoardProps) {
  const [tasks, setTasks] = useState(initialTasks)

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

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-4 gap-6 h-full">
        {COLUMNS.map((column) => {
          const columnTasks = getTasksByStatus(column.id)
          const Icon = column.icon
          
          return (
            <div key={column.id} className="flex flex-col">
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
                    className={`flex-1 rounded-xl p-3 transition-colors ${
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
                                projects={projects}
                                users={users}
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
    </DragDropContext>
  )
}
