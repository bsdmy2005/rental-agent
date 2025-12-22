"use client"

import { useMemo, useState, useCallback, useEffect, useRef } from "react"
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  NodeChange,
  applyNodeChanges,
  OnNodesChange
} from "reactflow"
import "reactflow/dist/style.css"
import { type SelectBillTemplate, type SelectRentalInvoiceTemplate, type SelectPayableTemplate } from "@/db/schema"
import { Button } from "@/components/ui/button"
import { RotateCcw, Save } from "lucide-react"
import { toast } from "sonner"

interface DependencyGraphProps {
  propertyId: string
  billTemplates: SelectBillTemplate[]
  invoiceTemplates: Array<SelectRentalInvoiceTemplate & { tenant: { name: string } | null }>
  payableTemplates: SelectPayableTemplate[]
}

export function DependencyGraph({
  propertyId,
  billTemplates,
  invoiceTemplates,
  payableTemplates
}: DependencyGraphProps) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [isLayoutSaved, setIsLayoutSaved] = useState(false)
  const initialNodesRef = useRef<Node[]>([])

  // Debug: Log props on mount/render
  if (process.env.NODE_ENV === 'development') {
    console.log('DependencyGraph props:', {
      billTemplates: billTemplates?.length ?? 'undefined',
      invoiceTemplates: invoiceTemplates?.length ?? 'undefined',
      payableTemplates: payableTemplates?.length ?? 'undefined',
      billTemplatesIsArray: Array.isArray(billTemplates),
      invoiceTemplatesIsArray: Array.isArray(invoiceTemplates),
      payableTemplatesIsArray: Array.isArray(payableTemplates)
    })
  }

  // Initialize nodes and edges with default positions
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    try {
      const nodes: Node[] = []
      const edges: Edge[] = []
      const nodePositions = new Map<string, { x: number; y: number }>()

      // Ensure all inputs are arrays
      const safeBillTemplates = Array.isArray(billTemplates) ? billTemplates : []
      const safeInvoiceTemplates = Array.isArray(invoiceTemplates) ? invoiceTemplates : []
      const safePayableTemplates = Array.isArray(payableTemplates) ? payableTemplates : []

      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('useMemo running with:', {
          safeBillTemplates: safeBillTemplates.length,
          safeInvoiceTemplates: safeInvoiceTemplates.length,
          safePayableTemplates: safePayableTemplates.length
        })
      }

    // Get active bill templates
    const activeBillTemplates = safeBillTemplates.filter((bt) => bt.isActive)
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('Inside useMemo - after filtering:', {
        safeBillTemplatesCount: safeBillTemplates.length,
        activeBillTemplatesCount: activeBillTemplates.length,
        safeInvoiceTemplatesCount: safeInvoiceTemplates.length,
        safePayableTemplatesCount: safePayableTemplates.length,
        firstBillTemplate: safeBillTemplates[0],
        firstInvoiceTemplate: safeInvoiceTemplates[0],
        firstPayableTemplate: safePayableTemplates[0]
      })
    }

    // Layout configuration - improved spacing to avoid overlaps
    const billTemplateX = 100
    const invoiceTemplateX = 500
    const payableTemplateX = 500
    const verticalSpacing = 120 // Increased spacing
    const horizontalSpacing = 400

    // Calculate starting Y positions to center groups vertically
    const totalBillHeight = activeBillTemplates.length * verticalSpacing || 0
    const totalInvoiceHeight = safeInvoiceTemplates.length * verticalSpacing || 0
    const totalPayableHeight = safePayableTemplates.length * verticalSpacing || 0
    const maxHeight = Math.max(
      totalBillHeight || 200, // Minimum height if no bill templates
      totalInvoiceHeight + totalPayableHeight + 100 || 200
    )
    
    const billTemplateYStart = activeBillTemplates.length > 0 
      ? (maxHeight - totalBillHeight) / 2 + 50 
      : 50
    const invoiceTemplateYStart = (safeInvoiceTemplates.length > 0 || safePayableTemplates.length > 0)
      ? (maxHeight - totalInvoiceHeight - totalPayableHeight - 100) / 2 + 50
      : 50
    const payableTemplateYStart = invoiceTemplateYStart + totalInvoiceHeight + (totalInvoiceHeight > 0 ? 100 : 0)

    // Create bill template nodes (left side)
    if (process.env.NODE_ENV === 'development') {
      console.log('Creating bill template nodes, count:', activeBillTemplates.length)
    }
    activeBillTemplates.forEach((billTemplate, index) => {
      const x = billTemplateX
      const y = billTemplateYStart + index * verticalSpacing
      const nodeId = `bill-${billTemplate.id}`

      nodePositions.set(nodeId, { x, y })

      const getBillTypeColor = (billType: string) => {
        switch (billType) {
          case "municipality":
            return "#3b82f6" // blue
          case "levy":
            return "#a855f7" // purple
          case "utility":
            return "#10b981" // green
          default:
            return "#6b7280" // gray
        }
      }

      nodes.push({
        id: nodeId,
        type: "default",
        position: { x, y },
        data: {
          label: (
            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-950 border-2 border-blue-300 dark:border-blue-700 rounded-lg min-w-[180px]">
              <div className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                {billTemplate.name}
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300 capitalize mt-1">
                {billTemplate.billType}
              </div>
            </div>
          )
        },
        style: {
          background: "transparent",
          border: "none",
          width: "auto"
        }
      })
    })

    // Create invoice template nodes (middle-right, top section)
    if (process.env.NODE_ENV === 'development') {
      console.log('Creating invoice template nodes, count:', safeInvoiceTemplates.length)
    }
    safeInvoiceTemplates.forEach((invoiceTemplate, index) => {
      const nodeId = `invoice-${invoiceTemplate.id}`
      const y = invoiceTemplateYStart + index * verticalSpacing

      nodePositions.set(nodeId, { x: invoiceTemplateX, y })

      nodes.push({
        id: nodeId,
        type: "default",
        position: { x: invoiceTemplateX, y },
        data: {
          label: (
            <div className="px-3 py-2 bg-green-50 dark:bg-green-950 border-2 border-green-300 dark:border-green-700 rounded-lg min-w-[180px]">
              <div className="font-semibold text-sm text-green-900 dark:text-green-100">
                {invoiceTemplate.name}
              </div>
              {invoiceTemplate.tenant && (
                <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                  {invoiceTemplate.tenant.name}
                </div>
              )}
            </div>
          )
        },
        style: {
          background: "transparent",
          border: "none",
          width: "auto"
        }
      })

      // Create edges from bill templates to invoice template
      // Handle dependsOnBillTemplateIds which might be string, array, or null
      let deps: string[] = []
      if (invoiceTemplate.dependsOnBillTemplateIds) {
        if (typeof invoiceTemplate.dependsOnBillTemplateIds === 'string') {
          try {
            deps = JSON.parse(invoiceTemplate.dependsOnBillTemplateIds)
          } catch {
            // If parsing fails, treat as single ID or empty
            deps = []
          }
        } else if (Array.isArray(invoiceTemplate.dependsOnBillTemplateIds)) {
          deps = invoiceTemplate.dependsOnBillTemplateIds
        }
      }
      
      deps.forEach((billTemplateId) => {
        const billNodeId = `bill-${billTemplateId}`
        if (nodePositions.has(billNodeId)) {
          edges.push({
            id: `edge-${billNodeId}-${nodeId}`,
            source: billNodeId,
            target: nodeId,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#10b981", strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#10b981"
            },
          })
        }
      })
    })

    // Create payable template nodes (right side, below invoices)
    if (process.env.NODE_ENV === 'development') {
      console.log('Creating payable template nodes, count:', safePayableTemplates.length)
    }
    safePayableTemplates.forEach((payableTemplate, index) => {
      const nodeId = `payable-${payableTemplate.id}`
      const y = payableTemplateYStart + index * verticalSpacing

      nodePositions.set(nodeId, { x: payableTemplateX, y })

      nodes.push({
        id: nodeId,
        type: "default",
        position: { x: payableTemplateX, y },
        data: {
          label: (
            <div className="px-3 py-2 bg-purple-50 dark:bg-purple-950 border-2 border-purple-300 dark:border-purple-700 rounded-lg min-w-[180px]">
              <div className="font-semibold text-sm text-purple-900 dark:text-purple-100">
                {payableTemplate.name}
              </div>
            </div>
          )
        },
        style: {
          background: "transparent",
          border: "none",
          width: "auto"
        }
      })

      // Create edges from bill templates to payable template
      // Handle dependsOnBillTemplateIds which might be string, array, or null
      let deps: string[] = []
      if (payableTemplate.dependsOnBillTemplateIds) {
        if (typeof payableTemplate.dependsOnBillTemplateIds === 'string') {
          try {
            deps = JSON.parse(payableTemplate.dependsOnBillTemplateIds)
          } catch {
            // If parsing fails, treat as single ID or empty
            deps = []
          }
        } else if (Array.isArray(payableTemplate.dependsOnBillTemplateIds)) {
          deps = payableTemplate.dependsOnBillTemplateIds
        }
      }
      
      deps.forEach((billTemplateId) => {
        const billNodeId = `bill-${billTemplateId}`
        if (nodePositions.has(billNodeId)) {
          edges.push({
            id: `edge-${billNodeId}-${nodeId}`,
            source: billNodeId,
            target: nodeId,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#a855f7", strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#a855f7"
            },
          })
        }
      })
    })

      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('useMemo returning:', {
          nodesCount: nodes.length,
          edgesCount: edges.length,
          nodeIds: nodes.map(n => n.id)
        })
      }

      return { nodes, edges }
    } catch (error) {
      console.error('Error in useMemo for DependencyGraph:', error)
      return { nodes: [], edges: [] }
    }
  }, [billTemplates, invoiceTemplates, payableTemplates])

  // Ensure initialNodes and initialEdges are always arrays
  const safeInitialNodes = initialNodes || []
  const safeInitialEdges = initialEdges || []

  // Update ref when initialNodes changes
  useEffect(() => {
    initialNodesRef.current = safeInitialNodes
  }, [safeInitialNodes])

  // Load saved layout from localStorage
  const loadSavedLayout = useCallback((): Record<string, { x: number; y: number }> | null => {
    if (typeof window === "undefined") return null
    try {
      const saved = localStorage.getItem(`dependency-graph-layout-${propertyId}`)
      return saved ? JSON.parse(saved) : null
    } catch (error) {
      console.error("Error loading saved layout:", error)
      return null
    }
  }, [propertyId])

  // Save layout to localStorage
  const saveLayout = useCallback(() => {
    if (typeof window === "undefined") return
    try {
      const layout: Record<string, { x: number; y: number }> = {}
      nodes.forEach((node) => {
        layout[node.id] = { x: node.position.x, y: node.position.y }
      })
      localStorage.setItem(`dependency-graph-layout-${propertyId}`, JSON.stringify(layout))
      setIsLayoutSaved(true)
      toast.success("Layout saved successfully")
      setTimeout(() => setIsLayoutSaved(false), 2000)
    } catch (error) {
      console.error("Error saving layout:", error)
      toast.error("Failed to save layout")
    }
  }, [nodes, propertyId])

  // Reset layout to default
  const resetLayout = useCallback(() => {
    if (typeof window === "undefined") return
    try {
      localStorage.removeItem(`dependency-graph-layout-${propertyId}`)
      // Reload with default positions using ref to avoid dependency issues
      setNodes([...initialNodesRef.current])
      toast.success("Layout reset to default")
    } catch (error) {
      console.error("Error resetting layout:", error)
      toast.error("Failed to reset layout")
    }
  }, [propertyId])

  // Load saved positions or use default positions
  useEffect(() => {
    // Only run if we have nodes and haven't already initialized
    if (safeInitialNodes.length === 0) return
    
    const savedLayout = loadSavedLayout()
    const nodesWithPositions = safeInitialNodes.map((node) => {
      if (savedLayout && savedLayout[node.id]) {
        return {
          ...node,
          position: savedLayout[node.id]
        }
      }
      return node
    })
    
    // Only update if nodes have actually changed (prevent infinite loop)
    setNodes((prevNodes) => {
      if (prevNodes.length === nodesWithPositions.length && 
          prevNodes.every((node, idx) => node.id === nodesWithPositions[idx].id)) {
        return prevNodes
      }
      return nodesWithPositions
    })
    
    setEdges((prevEdges) => {
      if (prevEdges.length === safeInitialEdges.length &&
          prevEdges.every((edge, idx) => edge.id === safeInitialEdges[idx]?.id)) {
        return prevEdges
      }
      return safeInitialEdges
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billTemplates, invoiceTemplates, payableTemplates, propertyId])

  // Handle node position changes
  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds))
    },
    []
  )

  // Debug: Log template counts (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('DependencyGraph Debug:', {
      billTemplatesCount: Array.isArray(billTemplates) ? billTemplates.length : 0,
      activeBillTemplatesCount: Array.isArray(billTemplates) ? billTemplates.filter(bt => bt.isActive).length : 0,
      invoiceTemplatesCount: Array.isArray(invoiceTemplates) ? invoiceTemplates.length : 0,
      payableTemplatesCount: Array.isArray(payableTemplates) ? payableTemplates.length : 0,
      nodesCount: safeInitialNodes.length,
      edgesCount: safeInitialEdges.length
    })
  }

  // Show message only if there are truly no templates at all
  // (invoice/payable templates should show even without active bill templates)
  const hasAnyTemplates = 
    safeInitialNodes.length > 0 ||
    (Array.isArray(billTemplates) && billTemplates.length > 0) ||
    (Array.isArray(invoiceTemplates) && invoiceTemplates.length > 0) ||
    (Array.isArray(payableTemplates) && payableTemplates.length > 0)

  if (!hasAnyTemplates) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No template dependencies configured yet.</p>
        <p className="text-xs mt-2">
          Configure invoice and payable templates with bill template dependencies to see the visualization.
        </p>
      </div>
    )
  }

  // If we have templates but no nodes were created, show helpful message
  // This can happen if all bill templates are inactive but invoice/payable templates exist
  // OR if invoice/payable templates have no dependencies configured
  if (safeInitialNodes.length === 0) {
    const hasInactiveBillTemplates = Array.isArray(billTemplates) && 
      billTemplates.length > 0 && 
      billTemplates.filter(bt => !bt.isActive).length > 0
    const hasInvoiceOrPayableTemplates = 
      (Array.isArray(invoiceTemplates) && invoiceTemplates.length > 0) ||
      (Array.isArray(payableTemplates) && payableTemplates.length > 0)

    return (
      <div className="text-center py-8 text-muted-foreground space-y-2">
        <p className="text-sm">Unable to display dependency graph.</p>
        {hasInactiveBillTemplates && (
          <p className="text-xs">
            Bill templates exist but are inactive. Activate at least one bill template to see the dependency graph.
          </p>
        )}
        {hasInvoiceOrPayableTemplates && !hasInactiveBillTemplates && (
          <p className="text-xs">
            Invoice or payable templates exist, but no bill templates are configured. Configure at least one bill template first.
          </p>
        )}
        {!hasInvoiceOrPayableTemplates && !hasInactiveBillTemplates && (
          <p className="text-xs">
            No invoice or payable templates are configured for this property.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Drag nodes to rearrange the layout. Click "Save Layout" to persist your arrangement.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetLayout}
            className="h-8"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset Layout
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={saveLayout}
            className="h-8"
            disabled={isLayoutSaved}
          >
            <Save className="h-3 w-3 mr-1" />
            {isLayoutSaved ? "Saved!" : "Save Layout"}
          </Button>
        </div>
      </div>
      <div className="w-full h-[600px] border rounded-lg bg-background">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1.5 }}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnDrag={[1, 2]} // Pan with middle mouse button or space + drag
          zoomOnScroll={true}
          zoomOnPinch={true}
          preventScrolling={false}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
          <Background color="#e5e7eb" gap={16} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(node) => {
              if (node.id.startsWith("bill-")) return "#3b82f6"
              if (node.id.startsWith("invoice-")) return "#10b981"
              if (node.id.startsWith("payable-")) return "#a855f7"
              return "#6b7280"
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
            position="bottom-right"
          />
        </ReactFlow>
      </div>
    </div>
  )
}

