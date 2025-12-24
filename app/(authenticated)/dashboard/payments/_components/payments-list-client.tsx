"use client"

import { useState, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PaymentsReadyTab } from "./payments-ready-tab"
import { PaymentsInProgressTab } from "./payments-in-progress-tab"
import { PaymentsCompletedTab } from "./payments-completed-tab"
import { PaymentsTemplatesTab } from "./payments-templates-tab"
import type { PayableInstanceWithDetails } from "@/queries/payable-instances-queries"

interface PaymentsListClientProps {
  payables: PayableInstanceWithDetails[]
  properties: Array<{ id: string; name: string }>
}

export function PaymentsListClient({ payables, properties }: PaymentsListClientProps) {
  const [selectedTab, setSelectedTab] = useState("ready")

  return (
    <div className="space-y-6">
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ready">Ready to Pay</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="ready" className="mt-6">
          <PaymentsReadyTab payables={payables} properties={properties} />
        </TabsContent>

        <TabsContent value="in-progress" className="mt-6">
          <PaymentsInProgressTab payables={payables} properties={properties} />
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <PaymentsCompletedTab payables={payables} properties={properties} />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <PaymentsTemplatesTab properties={properties} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

