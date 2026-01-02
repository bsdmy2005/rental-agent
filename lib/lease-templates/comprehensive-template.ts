/**
 * Comprehensive South African Residential Lease Agreement Template
 * Combines standard lease agreement structure with detailed legal provisions
 * Based on standard lease agreement template and comprehensive legal template
 */

export const comprehensiveLeaseTemplateData = {
  name: "Comprehensive Residential Lease Agreement (Standard)",
  sections: [
    {
      id: "header",
      type: "header",
      title: "AGREEMENT OF LEASE OF RESIDENCE",
      subtitle: "(South Africa)"
    },
    {
      id: "parties",
      type: "section",
      title: "1. PARTIES",
      content: "This Lease Agreement (\"Agreement\") is entered into on {{lease_date_full}} between:",
      subsections: [
        {
          id: "lessor",
          title: "1.1 (INSERT NAME) (\"the Lessor\"):",
          fields: [
            { id: "landlord_name", label: "Full Name / Entity", type: "text", required: true },
            { id: "landlord_id", label: "ID / Registration Number", type: "text", required: true },
            { id: "landlord_address", label: "Address", type: "text", required: true },
            { id: "landlord_email", label: "Email", type: "email", required: true },
            { id: "landlord_phone", label: "Contact Number", type: "tel", required: true }
          ]
        },
        {
          id: "lessee",
          title: "1.2 (INSERT NAME) (\"the Lessee\"):",
          fields: [
            { id: "tenant_name", label: "Full Name", type: "text", required: true },
            { id: "tenant_id", label: "ID / Passport Number", type: "text", required: true },
            { id: "tenant_address", label: "Current Address", type: "text", required: true },
            { id: "tenant_email", label: "Email", type: "email", required: true },
            { id: "tenant_phone", label: "Contact Number", type: "tel", required: true }
          ]
        }
      ],
      footer: "The Lessor and Lessee are collectively referred to as \"the Parties\"."
    },
    {
      id: "interpretation",
      type: "section",
      title: "2. INTERPRETATION",
      content: [
        "2.1 In this Agreement:",
        "2.1.1 clause headings are for reference purposes only and shall not influence its interpretation;",
        "2.1.2 the parties shall, wherever necessary or appropriate, be referred to by their defined designations as in clause 1 above;",
        "2.1.3 references to the masculine gender shall include the feminine and neuter genders and vice versa;",
        "2.1.4 references to natural persons shall include bodies corporate and other legal personae and vice versa;",
        "2.1.5 references to the singular shall include the plural and vice versa;",
        "2.1.6 all schedules and annexes hereto shall be deemed to be incorporated herein and shall form an integral part thereof;",
        "2.1.7 where a number of days is prescribed, it shall consist only of business days (i.e. days other than Saturdays, Sundays and Public Holidays) and shall be reckoned exclusively of the first and inclusively of the last day;",
        "2.1.8 where the day upon or by which any act is required to be performed is not a business day, the parties shall be deemed to have intended such act to be performed upon or by the 1st (first) business day thereafter;",
        "2.1.9 where an expression has been defined (whether in clause 2.2 below or elsewhere in this Agreement) and such definition contains a provision conferring rights or imposing obligations on any party, effect shall be given to that provision as if it were a substantive provision contained in the body of this Agreement;",
        "2.1.10 if figures are referred to in numerals and words, the words shall prevail in the event of any conflict between the two.",
        "",
        "2.2 In this Agreement, unless inconsistent with or otherwise indicated by the context, the following expressions shall bear the meanings assigned to them hereunder and cognate expressions shall bear corresponding meanings:",
        "",
        "2.2.1 the Premises - means: Erf No (INSERT NUMBER) (INSERT NAME) Township together with the dwelling and outbuildings erected thereon and situate at {{property_address}}; OR Apartment/Townhouse No (INSERT NUMBER) in the scheme known as (INSERT NAME) situate at {{property_address}} including the Exclusive Use Areas (if any); together with such furniture and other household effects (if any) as are listed in the Inventory attached hereto.",
        "",
        "2.2.2 the Rental - means: the amount referred to in clause 4.1 (or, if applicable clause 5.2.2 below as escalated in terms of clause 4.2 below);",
        "",
        "2.2.3 the Estate Agent - means: Messrs (INSERT NAME) trading as (INSERT NAME) of (INSERT ADDRESS) Refer Mr/Ms (INSERT NAME);",
        "",
        "2.2.4 the Deposit - means: the deposit referred to in clause 6 below;",
        "",
        "2.2.5 the Exclusive Use Areas - means: the following parts of the building referred to in clause 2.2.1.2 above and/or the land on which such building is erected, including (if applicable) the garden and yard of the townhouse/apartment referred to in clause 2.2.1.2 above."
      ],
      subsections: [
        {
          id: "premises_definition",
          title: "2.2.1 the Premises - means:",
          fields: [
            { id: "property_address", label: "Property Address", type: "text", required: true },
            { id: "erf_number", label: "Erf Number (if applicable)", type: "text", required: false },
            { id: "apartment_number", label: "Apartment/Townhouse Number (if applicable)", type: "text", required: false },
            { id: "scheme_name", label: "Scheme Name (if applicable)", type: "text", required: false }
          ]
        },
        {
          id: "estate_agent_definition",
          title: "2.2.3 the Estate Agent - means:",
          fields: [
            { id: "estate_agent_name", label: "Estate Agent Name", type: "text", required: false },
            { id: "estate_agent_trading_as", label: "Trading As", type: "text", required: false },
            { id: "estate_agent_address", label: "Address", type: "text", required: false },
            { id: "estate_agent_contact", label: "Contact Person (Mr/Ms)", type: "text", required: false }
          ]
        },
        {
          id: "exclusive_use_areas",
          title: "2.2.5 the Exclusive Use Areas - means:",
          fields: [
            { id: "exclusive_use_area_1", label: "Exclusive Use Area 1", type: "text", required: false },
            { id: "exclusive_use_area_2", label: "Exclusive Use Area 2", type: "text", required: false },
            { id: "exclusive_use_area_3", label: "Exclusive Use Area 3", type: "text", required: false },
            { id: "exclusive_use_area_4", label: "Exclusive Use Area 4", type: "text", required: false }
          ]
        }
      ]
    },
    {
      id: "letting_hiring",
      type: "section",
      title: "3. LETTING AND HIRING",
      content: [
        "3.1 The Lessor hereby lets to the Lessee, who hereby hires, the Premises subject to the terms and conditions contained in this Agreement.",
        "3.2 The Premises shall be personally occupied by (INSERT NUMBER OF PERSONS) and not more than (INSERT NUMBER) other persons."
      ],
      fields: [
        { id: "occupant_count", label: "Number of Occupants", type: "number", required: true }
      ]
    },
    {
      id: "rental",
      type: "section",
      title: "4. RENTAL AND SECURITY FOR PAYMENT",
      fields: [
        { id: "monthly_rental", label: "4.1 The Rental shall be R", type: "currency", required: true, suffix: "per month, subject to clause 4.2 below." },
        { id: "escalation_percentage", label: "4.2 The Rental shall be subject to an escalation of", type: "number", suffix: "% per annum from the 1st (first) day of (INSERT MONTH) of each year, and the amount referred to in clause 4.1 above, escalated as aforesaid, shall then, with effect from the said date, constitute the Rental." },
        { id: "rental_due_day", label: "4.3 The Rental shall be paid monthly in advance on the", type: "number", required: true, suffix: "day of each month, free of any deduction or set-off, at the offices of the Estate Agent or such other address as the Lessor may in writing direct." }
      ],
      content: [
        "4.4 During the period of this Lease, the Lessee shall not, without the prior written consent of the Lessor, remove any movable property brought onto the Premises by the Lessee at the commencement of or during the period of this Lease, it being understood that such movable property is to remain on the Premises as security for all Rentals or other payments for which the Lessee is liable in terms of this Agreement.",
        "",
        "*Delete 4.2 if not applicable"
      ]
    },
    {
      id: "lease_period",
      type: "section",
      title: "5. LEASE PERIOD",
      content: [
        "5.1 This Lease shall commence on the (INSERT DAY) day of (INSERT MONTH) 20(INSERT YEAR), and shall continue thereafter until terminated by either party giving to the other (INSERT) calendar months' written notice of termination; provided however that such notice of termination:-",
        "5.1.1 may not be given by either party so as to expire prior to the (INSERT DAY) day of (INSERT MONTH) 20(INSERT YEAR); and",
        "5.1.2 shall be valid only if given on or before the last day of any calendar month.",
        "",
        "5.2 This Lease shall commence on the (INSERT DAY) day of (INSERT MONTH) 20(INSERT YEAR) and shall terminate at midnight on the (INSERT DAY) day of (INSERT MONTH) 20(INSERT YEAR) (\"the expiry date\"). The Lessee has the option to renew this Lease for a further period of (INSERT) months (\"the renewal period\"), commencing on the 1st (first) day following the expiry date, on the same terms and conditions contained in this Agreement, provided that:-",
        "5.2.1 the Lessee shall exercise this option by giving written notice of such exercise to the Lessor on or before the (INSERT DAY) day of (INSERT MONTH) 20(INSERT YEAR), failing which the option shall lapse; and",
        "5.2.2 the Rental payable during the renewal period shall be R(INSERT AMOUNT) per month, subject to escalation in terms of clause 4.2 above.",
        "",
        "*Delete either 5.1 or 5.2 as applicable."
      ],
      fields: [
        { id: "commencement_date", label: "Commencement Date", type: "date", required: true },
        { id: "termination_date", label: "Termination Date", type: "date", required: true },
        { id: "notice_period_months", label: "Notice Period (months) - Option 5.1", type: "number" },
        { id: "renewal_period_months", label: "Renewal Period (months) - Option 5.2", type: "number" },
        { id: "renewal_rental", label: "Renewal Period Rental - Option 5.2", type: "currency" }
      ]
    },
    {
      id: "deposit",
      type: "section",
      title: "6. DEPOSIT",
      fields: [
        { id: "deposit_amount", label: "6.1 The Lessee shall, immediately after the Lessor has signed this Agreement, pay a deposit of R", type: "currency", required: true, suffix: "to the Estate Agent, to be retained in trust by the Estate Agent until the termination of this Lease." }
      ],
      content: [
        "6.2 Interest earned on the Deposit whilst retained in trust as aforesaid, shall accrue to the benefit of the Lessee.",
        "6.3 On the termination of this Lease, the Deposit shall be dealt with as follows, subject to clauses 11.2, 16.2 and 16.3 below:-",
        "6.3.1 the Lessor may, in his discretion, apply the Deposit towards the payment of all amounts for which the Lessee is liable under this Agreement, including, but without limitation, arrear Rental, unpaid electricity, water and telephone accounts, the cost of repairing damage to the Premises, and/or replacing lost keys; and",
        "6.3.2 the balance of the Deposit (if any) shall be refunded to the Lessee not later than 60 (sixty) days after the termination of this Lease."
      ]
    },
    {
      id: "additional_payments",
      type: "section",
      title: "7. ADDITIONAL PAYMENTS BY LESSEE",
      content: [
        "7.1 The Lessee shall, on demand, pay to the Lessor:",
        "7.1.1 the costs of drawing this Agreement; and",
        "7.1.2 all legal costs as between attorney and own client, incurred by the Lessor in respect of any legal steps taken by him against the Lessee to enforce any of the Lessee's obligations under this Agreement.",
        "",
        "7.2 Except insofar as they are included in any levy payable by the Lessor in terms of clause 9 below, the Lessee shall, from the date of commencement of this Lease, promptly pay for:",
        "7.2.1 all electricity (including electricity service charges), water and gas (if any) consumed on the Premises;",
        "7.2.2 all refuse removal fees levied on the Premises;",
        "7.2.3 all sewer, effluent and sanitary fees levied on the Premises;",
        "7.2.4 all charges arising out of any telephone service installed on the Premises;",
        "7.2.5 any other fees payable in respect of services rendered to the Premises during the period of this Lease.",
        "",
        "In the event of the Lessee failing to make payment of any of the foregoing, the Lessor shall have the right, without prejudice to his other rights in law or under this Agreement, to effect payment and recover from the Lessee the amount/s so expended.",
        "",
        "7.3 It is recorded that, as at the date of signature of this Agreement by the Lessor, the municipal rates and taxes/levy currently payable by the Lessor to the relevant local authority/body corporate/share block company/home owners' association in respect of the Premises is R(INSERT AMOUNT) per month. Should this amount increase during the period of this Lease, the Lessee shall be liable to pay such increase to the Lessor on demand."
      ],
      fields: [
        { id: "municipal_rates", label: "7.3 Municipal Rates/Levy (R per month)", type: "currency" }
      ]
    },
    {
      id: "utilities",
      type: "section",
      title: "8. UTILITIES AND CHARGES",
      content: [
        "Unless otherwise agreed in writing, the Lessee shall be responsible for:",
        "• Electricity (including electricity service charges)",
        "• Water",
        "• Gas (if any)",
        "• Refuse removal",
        "• Sewer, effluent and sanitary fees",
        "• Telephone service charges",
        "• Internet / DSTV / Fibre",
        "• Prepaid meter charges",
        "",
        "Body corporate levies and municipal rates remain the responsibility of the Lessor, subject to clause 7.3 above."
      ]
    },
    {
      id: "occupation",
      type: "section",
      title: "9. OCCUPATION & CONDITION",
      content: [
        "9.1 The Lessee confirms that the Premises are let in a habitable condition.",
        "9.2 A joint incoming inspection shall be conducted before occupation, with a signed inspection report forming part of this Agreement.",
        "9.3 A joint outgoing inspection shall be conducted within 3 days prior to vacating.",
        "9.4 The Lessee shall return the Premises in the same condition as received, fair wear and tear excepted."
      ]
    },
    {
      id: "maintenance",
      type: "section",
      title: "10. MAINTENANCE & REPAIRS",
      content: [
        "10.1 The Lessor is responsible for:",
        "• Structural integrity",
        "• Plumbing, electrical, and major systems (unless caused by Lessee negligence)",
        "• Maintenance of the exterior of the building",
        "",
        "10.2 The Lessee is responsible for:",
        "• Keeping the Premises clean and in good order",
        "• Minor maintenance (light bulbs, fuses, batteries, etc.)",
        "• Damage caused by negligence, abuse, or misuse",
        "• Keeping all drains, pipes and sanitary installations clear",
        "",
        "10.3 No alterations or additions may be made without written consent from the Lessor."
      ]
    },
    {
      id: "use_care",
      type: "section",
      title: "11. USE, CARE & CONDUCT",
      content: [
        "The Lessee shall:",
        "11.1 not cause nuisance or disturbance to neighbours or other occupants;",
        "11.2 comply with all body corporate / estate rules and regulations;",
        "11.3 not keep pets without the Lessor's prior written consent;",
        "11.4 not overload electrical systems or make unauthorised connections;",
        "11.5 not make any alterations or additions to the Premises or its appurtenances without the prior written consent of the Lessor;",
        "11.6 not paint, wallpaper, or otherwise decorate the walls, ceilings or floors of the Premises, or place or display any advertisements or notices of whatsoever nature on any part of the Premises, without the prior written consent of the Lessor;",
        "11.7 not interfere in any manner whatsoever with the existing electrical installations on the Premises or to connect any electrical equipment to the electricity supply, which may in any way damage the electrical installations or cause same to short-circuit;",
        "11.8 not keep or store any dangerous or hazardous material or substance on the Premises or do or permit anything to be done which may vitiate the Lessor's insurance on the Premises or cause an increase in the premiums payable thereunder;",
        "11.9 not hold, or permit the holding of, any sale by public auction whatsoever in or about the Premises."
      ]
    },
    {
      id: "subletting",
      type: "section",
      title: "12. SUB-LETTING & CESSION",
      content: [
        "12.1 Sub-letting or cession is strictly prohibited without prior written consent from the Lessor.",
        "12.2 Any unauthorised sub-letting or cession shall constitute a material breach of this Agreement."
      ]
    },
    {
      id: "access",
      type: "section",
      title: "13. ACCESS TO PREMISES",
      content: [
        "13.1 The Lessor may inspect the Premises with reasonable notice (normally 24 hours).",
        "13.2 Immediate access is permitted in emergencies.",
        "13.3 The Lessor or his authorised representatives may enter the Premises at reasonable times for the purpose of inspection, maintenance, or showing to prospective tenants or purchasers."
      ]
    },
    {
      id: "improvements",
      type: "section",
      title: "14. IMPROVEMENTS",
      content: [
        "14.1 Any improvements made by the Lessee on or to the Premises during the period of this Lease shall become the property of the Lessor on termination of this Lease, and the Lessee shall not be entitled to remove any such improvement or claim from the Lessor any compensation in respect thereof.",
        "14.2 Notwithstanding the provisions of clause 14.1 above, the Lessor shall be entitled at the termination of this Lease, to demand in writing that any improvement or addition made by the Lessee to the Premises shall be removed by the Lessee at his own cost. The Lessee shall at his own expense and to the satisfaction of the Lessor repair all damage and/or defects caused by such removal.",
        "14.3 Should the Lessee fail to comply with a demand made by the Lessor in terms of clause 14.2 above, the Lessor shall be entitled, in addition to any other remedy or right available to him in terms of this Agreement, to have the relevant improvement and/or addition removed and to recover the costs thereof from the Lessee, including the cost of repairing all damage and/or defects caused by such removal."
      ]
    },
    {
      id: "breach",
      type: "section",
      title: "15. BREACH",
      content: [
        "15.1 In the event of either of the parties (\"the defaulting party\") committing a breach of any of the terms of this Agreement and failing to remedy such breach within a period of 7 (seven) days after receipt of written notice from the other party (\"the aggrieved party\") calling upon the defaulting party to remedy the breach complained of, then the aggrieved party shall be entitled at his sole discretion and without prejudice to any of his other rights in law and/or in terms of this Agreement, either to claim specific performance of the terms of this Agreement or to cancel this Agreement forthwith and without further notice, and to claim damages from the defaulting party; provided that if the Lessee commits a breach of the provisions of this Agreement 3 (three) times in any calendar year, then upon the third breach, the Lessor shall be entitled immediately to implement either of the remedies referred to above, without first having to give the Lessee written notice to rectify such breach.",
        "15.2 In the event that the defaulting party is:-",
        "15.2.1 the Lessee, the full amount of the Deposit shall, on cancellation of this Agreement, be forfeited to the Lessor, subject to any remedies in that regard which are available to the Lessee in law;",
        "15.2.2 the Lessor, the Lessee shall not later than 30 (thirty) days after cancellation of this Agreement, receive from the Estate Agent the Deposit, less any deductions made therefrom in terms of clause 6.3.1 above.",
        "15.3 Should there be a dispute as to the determination of the defaulting party, the Estate Agent shall retain the Deposit in trust until such dispute is resolved either by agreement between the Lessor and the Lessee or by order of a competent court.",
        "15.4 Should this Agreement be cancelled by the Lessor for any reason whatsoever, the Lessee and/or any other person occupying the Premises on the Lessee's behalf, shall immediately vacate the Premises and allow the Lessor to take occupation thereof."
      ]
    },
    {
      id: "domicilium",
      type: "section",
      title: "16. DOMICILIUM CITANDI ET EXECUTANDI",
      content: [
        "16.1 The parties choose as their domicilia citandi et executandi for all purposes under this Agreement, whether in respect of court process, notices or other documents or communications of whatsoever nature the following addresses:",
        "16.1.1 The Lessor: {{landlord_address}}",
        "16.1.2 The Lessee: {{tenant_address}}",
        "",
        "16.2 Any notice or communication required or permitted to be given in terms of this Agreement shall be valid and effective only if given in writing but it shall be competent to give notice by telefax.",
        "",
        "16.3 Either party may by notice to the other change the physical address chosen as its domicilium citandi et executandi to another physical address in the Republic of South Africa, or its telefax number, provided that the change shall only become effective on the 7th (seventh) day after receipt of the notice by the addressee.",
        "",
        "16.4 Any notice to a party which is:",
        "16.4.1 sent by prepaid registered post in a correctly addressed envelope to it at its domicilium citandi et executandi shall be deemed to have been received on the fifth day after posting (unless the contrary is proved); or",
        "16.4.2 delivered by hand to a responsible person during ordinary business hours at its domicilium citandi et executandi shall be deemed to have been received on the day of delivery; or",
        "16.4.3 transmitted by telefax to its chosen telefax number (if any) stipulated in clause 16.1 above, shall be deemed to have been received on the date of transmission (unless the contrary is proved).",
        "",
        "16.5 Notwithstanding anything to the contrary herein contained, a written notice or communication actually received by a party shall be an adequate written notice or communication to it notwithstanding that it was not sent to or delivered at its chosen domicilium citandi et executandi."
      ]
    },
    {
      id: "general",
      type: "section",
      title: "17. GENERAL",
      content: [
        "17.1 The parties agree to the jurisdiction of the Magistrate's Court in connection with any action or suit arising from this Agreement or the cancellation hereof.",
        "17.2 Should two or more persons sign this Agreement as Lessors or Lessees, the said persons shall be liable, in solidum, for the due performance of their obligations in terms of this Agreement.",
        "17.3 This Agreement constitutes the sole and entire agreement between the parties, and no warranties, representations, guarantees or other terms and conditions of whatsoever nature not contained herein shall be of any force or effect.",
        "17.4 No variation of the terms and conditions of this Agreement or any consensual cancellation thereof shall be of any force or effect unless reduced to writing and signed by the parties or their duly authorised representatives.",
        "17.5 No indulgence which either party (\"the grantor\") may grant to the other party (\"the grantee\") shall constitute a waiver of any of the rights of the grantor who shall not thereby be precluded from exercising any rights against the grantee which may have arisen in the past or which might arise in the future.",
        "17.6 The Lessor hereby warrants that all consents required in terms of the Matrimonial Property Act 88 of 1984 have been duly furnished. [Note: Delete this clause if the Lessor is not married in community of property]"
      ]
    },
    {
      id: "special_conditions",
      type: "section",
      title: "18. SPECIAL CONDITIONS",
      content: [
        "The following special conditions apply to this Agreement:",
        "",
        "(INSERT SPECIAL CONDITIONS HERE)"
      ],
      fields: [
        { id: "special_conditions", label: "Special Conditions", type: "textarea" }
      ]
    },
    {
      id: "signatures",
      type: "signatures",
      title: "19. SIGNATURES",
      content: "THUS DONE AND SIGNED BY THE PARTIES ON THE DATES AND AT THE TIMES AND PLACES STATED HEREUNDER:-",
      signatureFields: [
        {
          id: "lessee_signature",
          label: "LESSEE",
          nameField: "tenant_name"
        },
        {
          id: "lessor_signature",
          label: "LESSOR",
          nameField: "landlord_name"
        }
      ],
      footer: "SIGNED at __________________ on this {{lease_date_full}}"
    }
  ]
}

