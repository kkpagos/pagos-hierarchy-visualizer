import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const TEAL = '#2BC4D4'

const PagosCheckbox = ({ checked, onClick }) => (
  <div
    className="w-4 h-4 rounded flex items-center justify-center cursor-pointer shrink-0 border transition-colors"
    style={checked
      ? { backgroundColor: TEAL, borderColor: TEAL }
      : { backgroundColor: 'white', borderColor: '#D1D5DB' }
    }
    onClick={onClick}
  >
    {checked && (
      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    )}
  </div>
)

const HierarchyTree = React.memo(({ hierarchyData, companyName }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedMids, setExpandedMids] = useState({})
  // checkedState stores only overrides — absence means checked (default)
  const [checkedState, setCheckedState] = useState({})

  const isChecked = (key) => checkedState[key] !== false

  const toggleChecked = (key, e) => {
    e?.stopPropagation()
    setCheckedState(prev => ({ ...prev, [key]: !isChecked(key) }))
  }

  const toggleMids = (key) => {
    setExpandedMids(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const displayName = companyName?.trim() || 'All Merchants'

  // Search helpers
  const nodeMatchesSearch = (node, q) => {
    if (!q) return true
    if (node.name.toLowerCase().includes(q)) return true
    if (node.mids?.some(m => m.toLowerCase().includes(q))) return true
    if (node.children) return node.children.some(c => nodeMatchesSearch(c, q))
    return false
  }

  const filterNode = (node, q) => {
    if (!nodeMatchesSearch(node, q)) return null
    if (node.mids) return node
    const filteredChildren = node.children.map(c => filterNode(c, q)).filter(Boolean)
    return { ...node, children: filteredChildren }
  }

  const filteredChildren = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!hierarchyData?.children) return []
    if (!q) return hierarchyData.children
    return hierarchyData.children.map(c => filterNode(c, q)).filter(Boolean)
  }, [hierarchyData, searchQuery])

  // Render a leaf node (has mids)
  const renderLeaf = (node, depth, pathKey) => {
    const midExpanded = expandedMids[pathKey]
    const pl = 12 + depth * 16

    return (
      <div key={pathKey}>
        <div
          className="flex items-center gap-2.5 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
          style={{ paddingLeft: `${pl}px`, paddingRight: '12px' }}
          onClick={() => toggleMids(pathKey)}
        >
          <PagosCheckbox
            checked={isChecked(pathKey)}
            onClick={(e) => toggleChecked(pathKey, e)}
          />
          <span className="text-sm text-gray-800 flex-1 select-none">{node.name}</span>
          <span className="text-xs text-gray-400 tabular-nums mr-1.5">
            {node.count} MID{node.count !== 1 ? 's' : ''}
          </span>
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 ${midExpanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <AnimatePresence>
          {midExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div
                className="mb-1 bg-gray-50 border border-gray-100 rounded-lg p-2.5"
                style={{ marginLeft: `${pl + 24}px`, marginRight: '12px' }}
              >
                <p className="text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wide">
                  MIDs in this tier
                </p>
                <div className="flex flex-wrap gap-1">
                  {node.mids.map(mid => (
                    <span
                      key={mid}
                      className="text-xs font-mono text-gray-600 bg-white border border-gray-200 px-1.5 py-0.5 rounded"
                    >
                      {mid}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Render a group node (has children)
  const renderGroup = (node, depth, pathKey) => {
    const pl = 12 + depth * 16
    const childPl = 12 + (depth + 1) * 16
    const hasMultiple = node.children.length > 1

    return (
      <div key={pathKey}>
        {/* Group label */}
        <div
          className="py-1.5 mt-1"
          style={{ paddingLeft: `${pl}px`, paddingRight: '12px' }}
        >
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider select-none">
            {node.name}
          </span>
        </div>

        {/* "All [group]" row — only when >1 children */}
        {hasMultiple && (
          <div
            className="flex items-center gap-2.5 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
            style={{ paddingLeft: `${childPl}px`, paddingRight: '12px' }}
            onClick={(e) => toggleChecked(`${pathKey}-all`, e)}
          >
            <PagosCheckbox
              checked={isChecked(`${pathKey}-all`)}
              onClick={(e) => toggleChecked(`${pathKey}-all`, e)}
            />
            <span className="text-sm text-gray-700 flex-1 select-none">All {node.name}</span>
            <span className="text-xs text-gray-400 tabular-nums">
              {node.count} MID{node.count !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Children */}
        {node.children.map((child, i) => renderNode(child, depth + 1, `${pathKey}-${i}`))}
      </div>
    )
  }

  const renderNode = (node, depth, pathKey) => {
    if (node.mids) return renderLeaf(node, depth, pathKey)
    return renderGroup(node, depth, pathKey)
  }

  if (!hierarchyData?.children) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm">Click "Generate Visualization" to see the hierarchy</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">

      {/* Company header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2.5 shrink-0">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0 select-none"
          style={{ backgroundColor: TEAL }}
        >
          {displayName[0]?.toUpperCase()}
        </div>
        <span className="font-semibold text-gray-900 text-sm">{displayName}</span>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-100 shrink-0">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-300 focus:border-cyan-300"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-1.5 text-xs text-gray-400">
            {filteredChildren.length > 0
              ? `${filteredChildren.length} result${filteredChildren.length !== 1 ? 's' : ''}`
              : 'No results'}
          </p>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto">
        {/* Root "All [company]" row */}
        <div
          className="flex items-center gap-2.5 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
          style={{ paddingLeft: '12px', paddingRight: '12px' }}
          onClick={(e) => toggleChecked('root', e)}
        >
          <PagosCheckbox
            checked={isChecked('root')}
            onClick={(e) => toggleChecked('root', e)}
          />
          <span className="text-sm text-gray-800 flex-1 select-none">All {displayName}</span>
          <span className="text-xs text-gray-400 tabular-nums">
            {hierarchyData.count} MID{hierarchyData.count !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Children */}
        {filteredChildren.length === 0 && searchQuery ? (
          <div className="text-center py-8 text-sm text-gray-400">
            No results for &ldquo;{searchQuery}&rdquo;
          </div>
        ) : (
          filteredChildren.map((node, i) => renderNode(node, 0, `n${i}`))
        )}
      </div>
    </div>
  )
})

HierarchyTree.displayName = 'HierarchyTree'

export default HierarchyTree
