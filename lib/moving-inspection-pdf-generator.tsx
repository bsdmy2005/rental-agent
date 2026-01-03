"use server"

import React from "react"
import { renderToStream } from "@react-pdf/renderer"
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"
import { db } from "@/db"
import {
  movingInspectionsTable,
  movingInspectionItemsTable,
  movingInspectionCategoriesTable,
  movingInspectionDefectsTable,
  movingInspectionComparisonsTable,
  leaseAgreementsTable,
  propertiesTable,
  tenantsTable
} from "@/db/schema"
import { eq, and, inArray, isNull, desc } from "drizzle-orm"
import { ActionState } from "@/types"
import { getMovingInspectionAction } from "@/actions/moving-inspections-actions"

interface InspectionPDFData {
  propertyName: string
  propertyAddress: string
  tenantName: string
  inspectionType: "moving_in" | "moving_out"
  inspectionDate: Date
  status: string
  items: Array<{
    id: string
    name: string
    categoryName: string
    categoryDisplayOrder: number
    roomInstanceNumber: number | null
    isPresent: boolean | null
    notes: string | null
    condition: string
    defects: Array<{
      id: string
      description: string
      severity: string
      isRepairable: boolean
    }>
  }>
  tenantSignatureData?: { image: string; signedAt?: string } | string | null
  landlordSignatureData?: { image: string; signedAt?: string } | string | null
  signedAt?: Date
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: "Helvetica"
  },
  header: {
    marginBottom: 20,
    borderBottom: "2px solid #000",
    paddingBottom: 10
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center"
  },
  subtitle: {
    fontSize: 11,
    textAlign: "center",
    marginBottom: 10
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 4,
    fontSize: 9
  },
  infoLabel: {
    width: "30%",
    fontWeight: "bold"
  },
  infoValue: {
    width: "70%"
  },
  categorySection: {
    marginTop: 15,
    marginBottom: 10
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 5,
    backgroundColor: "#f0f0f0",
    padding: 5
  },
  itemRow: {
    flexDirection: "row",
    marginBottom: 0,
    borderBottom: "0.5px solid #e0e0e0",
    minHeight: 20,
    break: false // Prevent row from breaking across pages
  },
  itemName: {
    width: "45%",
    fontSize: 9,
    padding: 6,
    borderRight: "0.5px solid #ccc",
    alignItems: "center"
  },
  itemCondition: {
    width: "20%",
    fontSize: 8,
    padding: 6,
    borderRight: "0.5px solid #ccc",
    alignItems: "center",
    justifyContent: "center"
  },
  itemYesNo: {
    width: "10%",
    fontSize: 9,
    padding: 6,
    borderRight: "0.5px solid #ccc",
    alignItems: "center",
    justifyContent: "center"
  },
  itemComment: {
    width: "35%",
    fontSize: 8,
    padding: 6,
    borderLeft: "2px solid #000",
    borderRight: "0.5px solid #ccc",
    minHeight: 20,
    alignItems: "center"
  },
  checkbox: {
    width: 10,
    height: 10,
    border: "1px solid #000",
    alignSelf: "center"
  },
  checkboxChecked: {
    backgroundColor: "#000"
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderBottom: "1px solid #000",
    minHeight: 25
  },
  headerCell: {
    padding: 6,
    fontSize: 9,
    fontWeight: "bold",
    alignItems: "center",
    justifyContent: "center"
  },
  headerCellItem: {
    width: "45%",
    borderRight: "0.5px solid #ccc"
  },
  headerCellCondition: {
    width: "20%",
    borderRight: "0.5px solid #ccc"
  },
  headerCellYesNo: {
    width: "10%",
    borderRight: "0.5px solid #ccc"
  },
  headerCellComment: {
    width: "35%",
    borderLeft: "2px solid #000",
    borderRight: "0.5px solid #ccc"
  },
  defectSection: {
    marginTop: 5,
    marginLeft: 20,
    padding: 5,
    backgroundColor: "#fff3cd",
    fontSize: 8
  },
  defectItem: {
    marginBottom: 3
  },
  signatureSection: {
    marginTop: 30,
    paddingTop: 15,
    borderTop: "1px solid #ccc"
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20
  },
  signatureBlock: {
    width: "45%"
  },
  signatureLine: {
    borderTop: "1px solid #000",
    marginTop: 40,
    paddingTop: 5
  },
  signatureLabel: {
    fontSize: 8,
    marginTop: 3
  },
  comparisonTable: {
    marginTop: 10
  },
  comparisonHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    padding: 5,
    fontWeight: "bold",
    fontSize: 8,
    borderBottom: "1px solid #000"
  },
  comparisonRow: {
    flexDirection: "row",
    padding: 4,
    borderBottom: "0.5px solid #ccc",
    fontSize: 8
  },
  comparisonCell: {
    padding: 3
  },
  changeHighlight: {
    backgroundColor: "#ffebee"
  }
})

const BlankInspectionPDFTemplate: React.FC<{ data: InspectionPDFData }> = ({ data }) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  // Group items by category
  const itemsByCategory = data.items.reduce((acc, item) => {
    const categoryName = item.categoryName
    if (!acc[categoryName]) {
      acc[categoryName] = {
        displayOrder: item.categoryDisplayOrder,
        items: []
      }
    }
    acc[categoryName].items.push(item)
    return acc
  }, {} as Record<string, { displayOrder: number; items: typeof data.items }>)

  const categories = Object.keys(itemsByCategory).sort(
    (a, b) => itemsByCategory[a].displayOrder - itemsByCategory[b].displayOrder
  )

  const getRoomDisplayName = (item: typeof data.items[0]) => {
    if (item.roomInstanceNumber) {
      if (item.categoryName === "Main Bedroom" || item.categoryName === "Other Bedrooms") {
        return `Bedroom ${item.roomInstanceNumber}`
      }
      return `${item.categoryName} ${item.roomInstanceNumber}`
    }
    return item.categoryName
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>DEFECT LIST - PROPERTY INSPECTION</Text>
          <Text style={styles.subtitle}>
            {data.inspectionType === "moving_in" ? "MOVING IN" : "MOVING OUT"} INSPECTION
          </Text>
        </View>

        <View style={{ marginBottom: 15 }}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Property:</Text>
            <Text style={styles.infoValue}>{data.propertyName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address:</Text>
            <Text style={styles.infoValue}>{data.propertyAddress}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tenant:</Text>
            <Text style={styles.infoValue}>{data.tenantName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{formatDate(data.inspectionDate)}</Text>
          </View>
        </View>

        {/* Table Header */}
        <View style={styles.headerRow} wrap={false}>
          <View style={[styles.headerCell, styles.headerCellItem]}>
            <Text>Item</Text>
          </View>
          <View style={[styles.headerCell, styles.headerCellCondition]}>
            <Text>Condition</Text>
          </View>
          <View style={[styles.headerCell, styles.headerCellComment]}>
            <Text>Comment</Text>
          </View>
        </View>

        {/* Items by Category */}
        {categories.map((categoryName) => {
          const categoryItems = itemsByCategory[categoryName].items
          const uniqueRooms = new Map<string, typeof categoryItems>()
          
          // Group by room instance if applicable
          categoryItems.forEach(item => {
            const roomKey = item.roomInstanceNumber 
              ? `${categoryName}_${item.roomInstanceNumber}` 
              : categoryName
            if (!uniqueRooms.has(roomKey)) {
              uniqueRooms.set(roomKey, [])
            }
            uniqueRooms.get(roomKey)!.push(item)
          })

          return Array.from(uniqueRooms.entries()).map(([roomKey, roomItems]) => (
            <View key={roomKey} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>
                {getRoomDisplayName(roomItems[0])}
              </Text>
              {roomItems.map((item) => {
                const getConditionLabel = (cond: string | null) => {
                  if (!cond) return "-"
                  switch (cond) {
                    case "good":
                      return "Good"
                    case "requires_repair":
                      return "Requires Repair"
                    case "requires_cleaning":
                      return "Requires Cleaning"
                    case "requires_repair_and_cleaning":
                      return "Repair & Cleaning"
                    default:
                      return cond
                  }
                }
                return (
                  <View key={item.id} style={styles.itemRow} wrap={false}>
                    <View style={styles.itemName}>
                      <Text>{item.name}</Text>
                    </View>
                    <View style={styles.itemCondition}>
                      <Text>{getConditionLabel(item.condition)}</Text>
                    </View>
                    <View style={styles.itemComment}>
                      <Text></Text>
                    </View>
                  </View>
                )
              })}
            </View>
          ))
        })}

        {/* Signatures Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Tenant Signature</Text>
              <View style={styles.signatureLine} />
            </View>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Landlord/Agent Signature</Text>
              <View style={styles.signatureLine} />
            </View>
          </View>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Date</Text>
              <View style={styles.signatureLine} />
            </View>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Date</Text>
              <View style={styles.signatureLine} />
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

const FilledInspectionPDFTemplate: React.FC<{ data: InspectionPDFData }> = ({ data }) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  // Group items by category
  const itemsByCategory = data.items.reduce((acc, item) => {
    const categoryName = item.categoryName
    if (!acc[categoryName]) {
      acc[categoryName] = {
        displayOrder: item.categoryDisplayOrder,
        items: []
      }
    }
    acc[categoryName].items.push(item)
    return acc
  }, {} as Record<string, { displayOrder: number; items: typeof data.items }>)

  const categories = Object.keys(itemsByCategory).sort(
    (a, b) => itemsByCategory[a].displayOrder - itemsByCategory[b].displayOrder
  )

  const getRoomDisplayName = (item: typeof data.items[0]) => {
    if (item.roomInstanceNumber) {
      if (item.categoryName === "Main Bedroom" || item.categoryName === "Other Bedrooms") {
        return `Bedroom ${item.roomInstanceNumber}`
      }
      return `${item.categoryName} ${item.roomInstanceNumber}`
    }
    return item.categoryName
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>DEFECT LIST - PROPERTY INSPECTION</Text>
          <Text style={styles.subtitle}>
            {data.inspectionType === "moving_in" ? "MOVING IN" : "MOVING OUT"} INSPECTION
          </Text>
        </View>

        <View style={{ marginBottom: 15 }}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Property:</Text>
            <Text style={styles.infoValue}>{data.propertyName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address:</Text>
            <Text style={styles.infoValue}>{data.propertyAddress}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tenant:</Text>
            <Text style={styles.infoValue}>{data.tenantName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{formatDate(data.inspectionDate)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={styles.infoValue}>{data.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Table Header */}
        <View style={styles.headerRow} wrap={false}>
          <View style={[styles.headerCell, styles.headerCellItem]}>
            <Text>Item</Text>
          </View>
          <View style={[styles.headerCell, styles.headerCellCondition]}>
            <Text>Condition</Text>
          </View>
          <View style={[styles.headerCell, styles.headerCellComment]}>
            <Text>Comment</Text>
          </View>
        </View>

        {/* Items by Category */}
        {categories.map((categoryName) => {
          const categoryItems = itemsByCategory[categoryName].items
          const uniqueRooms = new Map<string, typeof categoryItems>()
          
          categoryItems.forEach(item => {
            const roomKey = item.roomInstanceNumber 
              ? `${categoryName}_${item.roomInstanceNumber}` 
              : categoryName
            if (!uniqueRooms.has(roomKey)) {
              uniqueRooms.set(roomKey, [])
            }
            uniqueRooms.get(roomKey)!.push(item)
          })

          return Array.from(uniqueRooms.entries()).map(([roomKey, roomItems]) => (
            <View key={roomKey} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>
                {getRoomDisplayName(roomItems[0])}
              </Text>
              {roomItems.map((item) => {
                const getConditionLabel = (cond: string | null) => {
                  if (!cond) return "-"
                  switch (cond) {
                    case "good":
                      return "Good"
                    case "requires_repair":
                      return "Requires Repair"
                    case "requires_cleaning":
                      return "Requires Cleaning"
                    case "requires_repair_and_cleaning":
                      return "Repair & Cleaning"
                    default:
                      return cond
                  }
                }
                return (
                  <View key={item.id} wrap={false}>
                    <View style={styles.itemRow}>
                      <View style={styles.itemName}>
                        <Text>{item.name}</Text>
                      </View>
                      <View style={styles.itemCondition}>
                        <Text>{getConditionLabel(item.condition)}</Text>
                      </View>
                      <View style={styles.itemComment}>
                        <Text>{item.notes || ""}</Text>
                      </View>
                    </View>
                    {item.defects.length > 0 && (
                      <View style={styles.defectSection}>
                        {item.defects.map((defect) => (
                          <View key={defect.id} style={styles.defectItem}>
                            <Text>
                              • {defect.description} ({defect.severity})
                              {defect.isRepairable ? " - Repairable" : " - As-Is"}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          ))
        })}

        {/* Signatures Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Tenant Signature</Text>
              {data.tenantSignatureData ? (
                <View style={{ marginTop: 5 }}>
                  {typeof data.tenantSignatureData === "string" && data.tenantSignatureData.startsWith("data:image") ? (
                    <Image
                      src={data.tenantSignatureData}
                      style={{ width: 150, height: 60, objectFit: "contain" }}
                    />
                  ) : (
                    <Text style={{ fontSize: 8 }}>Signed</Text>
                  )}
                </View>
              ) : (
                <View style={styles.signatureLine} />
              )}
            </View>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Landlord/Agent Signature</Text>
              {data.landlordSignatureData ? (
                <View style={{ marginTop: 5 }}>
                  {typeof data.landlordSignatureData === "string" && data.landlordSignatureData.startsWith("data:image") ? (
                    <Image
                      src={data.landlordSignatureData}
                      style={{ width: 150, height: 60, objectFit: "contain" }}
                    />
                  ) : (
                    <Text style={{ fontSize: 8 }}>Signed</Text>
                  )}
                </View>
              ) : (
                <View style={styles.signatureLine} />
              )}
            </View>
          </View>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Date</Text>
              <Text style={{ fontSize: 8, marginTop: 5 }}>
                {data.signedAt ? formatDate(data.signedAt) : ""}
              </Text>
            </View>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Date</Text>
              <Text style={{ fontSize: 8, marginTop: 5 }}>
                {data.signedAt ? formatDate(data.signedAt) : ""}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

const MoveOutReportPDFTemplate: React.FC<{
  data: InspectionPDFData
  moveInData: InspectionPDFData
  comparisons: Array<{
    itemId: string
    conditionChange: string
    comparisonNotes: string | null
    damageChargeApplicable: boolean
    damageChargeAmount: string | null
    item: {
      name: string
      category: { name: string }
    }
  }>
}> = ({ data, moveInData, comparisons }) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  // Group items by category (for move-out inspection display)
  const itemsByCategory = data.items.reduce((acc, item) => {
    const categoryName = item.categoryName
    if (!acc[categoryName]) {
      acc[categoryName] = {
        displayOrder: item.categoryDisplayOrder,
        items: []
      }
    }
    acc[categoryName].items.push(item)
    return acc
  }, {} as Record<string, { displayOrder: number; items: typeof data.items }>)

  const categories = Object.keys(itemsByCategory).sort(
    (a, b) => itemsByCategory[a].displayOrder - itemsByCategory[b].displayOrder
  )

  const getRoomDisplayName = (item: typeof data.items[0]) => {
    if (item.roomInstanceNumber) {
      if (item.categoryName === "Main Bedroom" || item.categoryName === "Other Bedrooms") {
        return `Bedroom ${item.roomInstanceNumber}`
      }
      return `${item.categoryName} ${item.roomInstanceNumber}`
    }
    return item.categoryName
  }

  // Create a map of items for quick lookup (for comparisons)
  const moveInItemsMap = new Map(moveInData.items.map(item => [item.id, item]))
  const moveOutItemsMap = new Map(data.items.map(item => [item.id, item]))

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>MOVE-OUT INSPECTION REPORT</Text>
          <Text style={styles.subtitle}>COMPARISON WITH MOVE-IN INSPECTION</Text>
        </View>

        <View style={{ marginBottom: 15 }}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Property:</Text>
            <Text style={styles.infoValue}>{data.propertyName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address:</Text>
            <Text style={styles.infoValue}>{data.propertyAddress}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tenant:</Text>
            <Text style={styles.infoValue}>{data.tenantName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Move-In Date:</Text>
            <Text style={styles.infoValue}>{formatDate(moveInData.inspectionDate)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Move-Out Date:</Text>
            <Text style={styles.infoValue}>{formatDate(data.inspectionDate)}</Text>
          </View>
        </View>

        {/* Move-Out Inspection Items Table */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: "bold", marginBottom: 10 }}>MOVE-OUT INSPECTION ITEMS</Text>
          
          {/* Table Header */}
          <View style={styles.headerRow} wrap={false}>
            <View style={[styles.headerCell, styles.headerCellItem]}>
              <Text>Item</Text>
            </View>
            <View style={[styles.headerCell, styles.headerCellCondition]}>
              <Text>Condition</Text>
            </View>
            <View style={[styles.headerCell, styles.headerCellComment]}>
              <Text>Comment</Text>
            </View>
          </View>

          {/* Items by Category */}
          {categories.map((categoryName) => {
            const categoryItems = itemsByCategory[categoryName].items
            const uniqueRooms = new Map<string, typeof categoryItems>()
            
            categoryItems.forEach(item => {
              const roomKey = item.roomInstanceNumber 
                ? `${categoryName}_${item.roomInstanceNumber}` 
                : categoryName
              if (!uniqueRooms.has(roomKey)) {
                uniqueRooms.set(roomKey, [])
              }
              uniqueRooms.get(roomKey)!.push(item)
            })

            return Array.from(uniqueRooms.entries()).map(([roomKey, roomItems]) => (
              <View key={roomKey} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>
                  {getRoomDisplayName(roomItems[0])}
                </Text>
                {roomItems.map((item) => {
                  const getConditionLabel = (cond: string | null) => {
                    if (!cond) return "-"
                    switch (cond) {
                      case "good":
                        return "Good"
                      case "requires_repair":
                        return "Requires Repair"
                      case "requires_cleaning":
                        return "Requires Cleaning"
                      case "requires_repair_and_cleaning":
                        return "Repair & Cleaning"
                      default:
                        return cond
                    }
                  }
                  return (
                    <View key={item.id} wrap={false}>
                      <View style={styles.itemRow}>
                        <View style={styles.itemName}>
                          <Text>{item.name}</Text>
                        </View>
                        <View style={styles.itemCondition}>
                          <Text>{getConditionLabel(item.condition)}</Text>
                        </View>
                        <View style={styles.itemComment}>
                          <Text>{item.notes || ""}</Text>
                        </View>
                      </View>
                      {item.defects.length > 0 && (
                        <View style={styles.defectSection}>
                          {item.defects.map((defect) => (
                            <View key={defect.id} style={styles.defectItem}>
                              <Text>
                                • {defect.description} ({defect.severity})
                                {defect.isRepairable ? " - Repairable" : " - As-Is"}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )
                })}
              </View>
            ))
          })}
        </View>

        {/* Comparison Table (if comparisons exist) */}
        {comparisons.length > 0 && (
          <View style={{ marginTop: 20, marginBottom: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: "bold", marginBottom: 10 }}>COMPARISON WITH MOVE-IN INSPECTION</Text>
            <View style={styles.comparisonTable}>
              <View style={styles.comparisonHeader}>
                <Text style={[styles.comparisonCell, { width: "30%" }]}>Item</Text>
                <Text style={[styles.comparisonCell, { width: "20%" }]}>Move-In</Text>
                <Text style={[styles.comparisonCell, { width: "20%" }]}>Move-Out</Text>
                <Text style={[styles.comparisonCell, { width: "15%" }]}>Change</Text>
                <Text style={[styles.comparisonCell, { width: "15%" }]}>Charge</Text>
              </View>

              {comparisons.map((comparison) => {
                const moveOutItem = moveOutItemsMap.get(comparison.itemId)
                const moveInItem = Array.from(moveInItemsMap.values()).find(
                  item => item.name === comparison.item.name && 
                  item.categoryName === comparison.item.category.name
                )

                const hasChange = comparison.conditionChange !== "same" || 
                  (moveInItem?.condition !== moveOutItem?.condition) ||
                  (moveInItem?.notes !== moveOutItem?.notes)

                return (
                  <View 
                    key={comparison.itemId} 
                    style={[
                      styles.comparisonRow,
                      ...(hasChange ? [styles.changeHighlight] : [])
                    ]}
                  >
                    <Text style={[styles.comparisonCell, { width: "30%" }]}>
                      {comparison.item.name}
                    </Text>
                    <Text style={[styles.comparisonCell, { width: "20%" }]}>
                      {moveInItem?.condition 
                        ? (moveInItem.condition === "good" ? "Good" 
                          : moveInItem.condition === "requires_repair" ? "Repair"
                          : moveInItem.condition === "requires_cleaning" ? "Cleaning"
                          : moveInItem.condition === "requires_repair_and_cleaning" ? "Both"
                          : moveInItem.condition)
                        : "-"}
                      {moveInItem?.notes ? ` (${moveInItem.notes})` : ""}
                    </Text>
                    <Text style={[styles.comparisonCell, { width: "20%" }]}>
                      {moveOutItem?.condition 
                        ? (moveOutItem.condition === "good" ? "Good" 
                          : moveOutItem.condition === "requires_repair" ? "Repair"
                          : moveOutItem.condition === "requires_cleaning" ? "Cleaning"
                          : moveOutItem.condition === "requires_repair_and_cleaning" ? "Both"
                          : moveOutItem.condition)
                        : "-"}
                      {moveOutItem?.notes ? ` (${moveOutItem.notes})` : ""}
                    </Text>
                    <Text style={[styles.comparisonCell, { width: "15%" }]}>
                      {comparison.conditionChange.replace(/_/g, " ")}
                    </Text>
                    <Text style={[styles.comparisonCell, { width: "15%" }]}>
                      {comparison.damageChargeApplicable 
                        ? (comparison.damageChargeAmount ? `R ${comparison.damageChargeAmount}` : "TBD")
                        : "-"}
                    </Text>
                  </View>
                )
              })}
            </View>

            {/* Summary */}
            <View style={{ marginTop: 20, padding: 10, backgroundColor: "#f0f0f0" }}>
              <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 5 }}>Summary</Text>
              <Text style={{ fontSize: 9 }}>
                Total Items Compared: {comparisons.length}
              </Text>
              <Text style={{ fontSize: 9 }}>
                Items with Changes: {comparisons.filter(c => c.conditionChange !== "same").length}
              </Text>
              <Text style={{ fontSize: 9 }}>
                Items Requiring Charges: {comparisons.filter(c => c.damageChargeApplicable).length}
              </Text>
            </View>
          </View>
        )}

        {/* Signatures Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Tenant Signature</Text>
              {data.tenantSignatureData ? (
                <View style={{ marginTop: 5 }}>
                  {typeof data.tenantSignatureData === "string" && data.tenantSignatureData.startsWith("data:image") ? (
                    <Image
                      src={data.tenantSignatureData}
                      style={{ width: 150, height: 60, objectFit: "contain" }}
                    />
                  ) : (
                    <Text style={{ fontSize: 8 }}>Signed</Text>
                  )}
                </View>
              ) : (
                <View style={styles.signatureLine} />
              )}
            </View>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Landlord/Agent Signature</Text>
              {data.landlordSignatureData ? (
                <View style={{ marginTop: 5 }}>
                  {typeof data.landlordSignatureData === "string" && data.landlordSignatureData.startsWith("data:image") ? (
                    <Image
                      src={data.landlordSignatureData}
                      style={{ width: 150, height: 60, objectFit: "contain" }}
                    />
                  ) : (
                    <Text style={{ fontSize: 8 }}>Signed</Text>
                  )}
                </View>
              ) : (
                <View style={styles.signatureLine} />
              )}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

/**
 * Get inspection data with property and tenant info
 */
async function getInspectionDataForPDF(inspectionId: string): Promise<ActionState<InspectionPDFData>> {
  try {
    const result = await getMovingInspectionAction(inspectionId)
    if (!result.isSuccess || !result.data) {
      return { isSuccess: false, message: "Inspection not found" }
    }

    const inspection = result.data

    // Get lease and property
    const [lease] = await db
      .select()
      .from(leaseAgreementsTable)
      .where(eq(leaseAgreementsTable.id, inspection.leaseAgreementId))
      .limit(1)

    if (!lease) {
      return { isSuccess: false, message: "Lease not found" }
    }

    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, lease.propertyId))
      .limit(1)

    if (!property) {
      return { isSuccess: false, message: "Property not found" }
    }

    const [tenant] = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, lease.tenantId))
      .limit(1)

    if (!tenant) {
      return { isSuccess: false, message: "Tenant not found" }
    }

    const propertyAddress = `${property.streetAddress}, ${property.suburb}, ${property.province}`

    const pdfData: InspectionPDFData = {
      propertyName: property.name,
      propertyAddress,
      tenantName: tenant.name,
      inspectionType: inspection.inspectionType,
      inspectionDate: inspection.createdAt,
      status: inspection.status,
      items: inspection.items.map(item => ({
        id: item.id,
        name: item.name,
        categoryName: item.category.name,
        categoryDisplayOrder: item.category.displayOrder,
        roomInstanceNumber: item.roomInstanceNumber,
        isPresent: item.isPresent,
        notes: item.notes,
        condition: item.condition || "",
        defects: item.defects.map(defect => ({
          id: defect.id,
          description: defect.description,
          severity: defect.severity,
          isRepairable: defect.isRepairable
        }))
      })),
      tenantSignatureData: (inspection.tenantSignatureData && typeof inspection.tenantSignatureData === 'object' && 'image' in inspection.tenantSignatureData
        ? (inspection.tenantSignatureData as { image: string; signedAt?: string }).image
        : inspection.tenantSignatureData) as string | { image: string; signedAt?: string } | null | undefined,
      landlordSignatureData: (inspection.landlordSignatureData && typeof inspection.landlordSignatureData === 'object' && 'image' in inspection.landlordSignatureData
        ? (inspection.landlordSignatureData as { image: string; signedAt?: string }).image
        : inspection.landlordSignatureData) as string | { image: string; signedAt?: string } | null | undefined,
      signedAt: inspection.signedAt || undefined
    }

    return {
      isSuccess: true,
      message: "Inspection data retrieved successfully",
      data: pdfData
    }
  } catch (error) {
    console.error("Error getting inspection data for PDF:", error)
    return { isSuccess: false, message: "Failed to get inspection data" }
  }
}

/**
 * Generate blank inspection PDF
 */
export async function generateBlankInspectionPDFAction(
  inspectionId: string
): Promise<ActionState<Buffer>> {
  try {
    const result = await getInspectionDataForPDF(inspectionId)
    if (!result.isSuccess || !result.data) {
      return { isSuccess: false, message: result.message }
    }

    const pdfDoc = <BlankInspectionPDFTemplate data={result.data} />
    const stream = await renderToStream(pdfDoc)

    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk))
    }
    const pdfBuffer = Buffer.concat(chunks)

    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      return {
        isSuccess: false,
        message: "Failed to generate PDF buffer"
      }
    }

    const pdfMagicBytes = pdfBuffer.slice(0, 4).toString("ascii")
    if (pdfMagicBytes !== "%PDF") {
      return {
        isSuccess: false,
        message: "Generated buffer is not a valid PDF file"
      }
    }

    return {
      isSuccess: true,
      message: "Blank PDF generated successfully",
      data: pdfBuffer
    }
  } catch (error) {
    console.error("Error generating blank inspection PDF:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to generate blank PDF"
    }
  }
}

/**
 * Generate filled inspection PDF
 */
export async function generateFilledInspectionPDFAction(
  inspectionId: string
): Promise<ActionState<Buffer>> {
  try {
    const result = await getInspectionDataForPDF(inspectionId)
    if (!result.isSuccess || !result.data) {
      return { isSuccess: false, message: result.message }
    }

    const pdfDoc = <FilledInspectionPDFTemplate data={result.data} />
    const stream = await renderToStream(pdfDoc)

    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk))
    }
    const pdfBuffer = Buffer.concat(chunks)

    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      return {
        isSuccess: false,
        message: "Failed to generate PDF buffer"
      }
    }

    const pdfMagicBytes = pdfBuffer.slice(0, 4).toString("ascii")
    if (pdfMagicBytes !== "%PDF") {
      return {
        isSuccess: false,
        message: "Generated buffer is not a valid PDF file"
      }
    }

    return {
      isSuccess: true,
      message: "Filled PDF generated successfully",
      data: pdfBuffer
    }
  } catch (error) {
    console.error("Error generating filled inspection PDF:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to generate filled PDF"
    }
  }
}

/**
 * Generate move-out comparison report PDF
 */
export async function generateMoveOutReportPDFAction(
  moveOutInspectionId: string
): Promise<ActionState<Buffer>> {
  try {
    // Get move-out inspection data
    const moveOutResult = await getInspectionDataForPDF(moveOutInspectionId)
    if (!moveOutResult.isSuccess || !moveOutResult.data) {
      return { isSuccess: false, message: "Move-out inspection not found" }
    }

    if (moveOutResult.data.inspectionType !== "moving_out") {
      return { isSuccess: false, message: "Inspection is not a move-out inspection" }
    }

    // Get move-in inspection
    const [moveOutInspection] = await db
      .select()
      .from(movingInspectionsTable)
      .where(eq(movingInspectionsTable.id, moveOutInspectionId))
      .limit(1)

    if (!moveOutInspection) {
      return { isSuccess: false, message: "Move-out inspection not found" }
    }

    // Find corresponding move-in inspection
    const moveInInspections = await db
      .select()
      .from(movingInspectionsTable)
      .where(
        and(
          eq(movingInspectionsTable.leaseAgreementId, moveOutInspection.leaseAgreementId),
          eq(movingInspectionsTable.inspectionType, "moving_in")
        )
      )
      .orderBy(desc(movingInspectionsTable.createdAt))
      .limit(1)
    
    const moveInInspection = moveInInspections[0]

    if (!moveInInspection) {
      return { isSuccess: false, message: "Corresponding move-in inspection not found" }
    }

    const moveInResult = await getInspectionDataForPDF(moveInInspection.id)
    if (!moveInResult.isSuccess || !moveInResult.data) {
      return { isSuccess: false, message: "Failed to get move-in inspection data" }
    }

    // Get comparison report with manual joins
    const comparisons = await db
      .select({
        id: movingInspectionComparisonsTable.id,
        itemId: movingInspectionComparisonsTable.itemId,
        conditionChange: movingInspectionComparisonsTable.conditionChange,
        comparisonNotes: movingInspectionComparisonsTable.comparisonNotes,
        damageChargeApplicable: movingInspectionComparisonsTable.damageChargeApplicable,
        damageChargeAmount: movingInspectionComparisonsTable.damageChargeAmount,
        itemName: movingInspectionItemsTable.name,
        categoryName: movingInspectionCategoriesTable.name
      })
      .from(movingInspectionComparisonsTable)
      .innerJoin(
        movingInspectionItemsTable,
        eq(movingInspectionComparisonsTable.itemId, movingInspectionItemsTable.id)
      )
      .innerJoin(
        movingInspectionCategoriesTable,
        eq(movingInspectionItemsTable.categoryId, movingInspectionCategoriesTable.id)
      )
      .where(eq(movingInspectionComparisonsTable.movingOutInspectionId, moveOutInspectionId))

    const comparisonData = comparisons.map(c => ({
      itemId: c.itemId,
      conditionChange: c.conditionChange,
      comparisonNotes: c.comparisonNotes,
      damageChargeApplicable: c.damageChargeApplicable,
      damageChargeAmount: c.damageChargeAmount,
      item: {
        name: c.itemName,
        category: {
          name: c.categoryName
        }
      }
    }))

    const pdfDoc = (
      <MoveOutReportPDFTemplate
        data={moveOutResult.data}
        moveInData={moveInResult.data}
        comparisons={comparisonData}
      />
    )
    const stream = await renderToStream(pdfDoc)

    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk))
    }
    const pdfBuffer = Buffer.concat(chunks)

    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      return {
        isSuccess: false,
        message: "Failed to generate PDF buffer"
      }
    }

    const pdfMagicBytes = pdfBuffer.slice(0, 4).toString("ascii")
    if (pdfMagicBytes !== "%PDF") {
      return {
        isSuccess: false,
        message: "Generated buffer is not a valid PDF file"
      }
    }

    return {
      isSuccess: true,
      message: "Move-out report PDF generated successfully",
      data: pdfBuffer
    }
  } catch (error) {
    console.error("Error generating move-out report PDF:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to generate move-out report PDF"
    }
  }
}

