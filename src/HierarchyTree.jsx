import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const HierarchyTree = React.memo(({ hierarchyData, levelAliases = {}, expandedNodes = {}, onToggleExpanded }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [originalExpandedState, setOriginalExpandedState] = useState({})

  const isExpanded = (nodeKey) => expandedNodes[nodeKey] || false

  // Helper function to get display label with alias
  const getDisplayLabel = (levelName) => {
    return levelAliases[levelName] || levelName
  }

  // Recursive function to check if a node matches search query
  const nodeMatchesSearch = (node, query) => {
    if (!query.trim()) return true
    
    const lowerQuery = query.toLowerCase()
    
    // Check node name
    if (node.name.toLowerCase().includes(lowerQuery)) {
      return true
    }
    
    // Check MIDs if present
    if (node.mids) {
      return node.mids.some(mid => mid.toLowerCase().includes(lowerQuery))
    }
    
    // Check children recursively
    if (node.children) {
      return node.children.some(child => nodeMatchesSearch(child, query))
    }
    
    return false
  }

  // Recursive function to filter hierarchy data
  const filterHierarchy = (nodes, query) => {
    if (!query.trim()) return nodes
    
    return nodes.filter(node => {
      const nodeMatches = nodeMatchesSearch(node, query)
      
      if (nodeMatches) {
        return true
      }
      
      // Check if any children match
      if (node.children) {
        const filteredChildren = filterHierarchy(node.children, query)
        return filteredChildren.length > 0
      }
      
      return false
    }).map(node => {
      if (node.children) {
        return {
          ...node,
          children: filterHierarchy(node.children, query)
        }
      }
      return node
    })
  }

  // Memoize filtered hierarchy to prevent unnecessary re-renders
  const filteredHierarchy = React.useMemo(() => {
    return hierarchyData?.children ? 
      filterHierarchy(hierarchyData.children, searchQuery) : []
  }, [hierarchyData, searchQuery])

  // Auto-expand nodes that contain search results
  React.useEffect(() => {
    if (searchQuery.trim()) {
      // Save original state if this is the first search
      setOriginalExpandedState(prev => {
        if (Object.keys(prev).length === 0) {
          return expandedNodes
        }
        return prev
      })
      
      const newExpandedNodes = {}
      
      const expandMatchingNodes = (nodes, path = '') => {
        nodes.forEach((node, index) => {
          const nodeKey = path ? `${path}-${index}` : `root-${index}`
          
          if (node.children && node.children.length > 0) {
            // Check if this node or any of its children match
            if (nodeMatchesSearch(node, searchQuery)) {
              newExpandedNodes[nodeKey] = true
            }
            expandMatchingNodes(node.children, nodeKey)
          }
        })
      }
      
      expandMatchingNodes(filteredHierarchy)
      
      // Only update if the new state is different
      const currentKeys = Object.keys(expandedNodes).sort()
      const newKeys = Object.keys(newExpandedNodes).sort()
      const isDifferent = currentKeys.length !== newKeys.length || 
        currentKeys.some((key, index) => key !== newKeys[index]) ||
        currentKeys.some(key => expandedNodes[key] !== newExpandedNodes[key])
      
      if (isDifferent && onToggleExpanded) {
        // Update all expanded nodes through the parent
        Object.keys(newExpandedNodes).forEach(nodeKey => {
          if (!expandedNodes[nodeKey]) {
            onToggleExpanded(nodeKey)
          }
        })
        Object.keys(expandedNodes).forEach(nodeKey => {
          if (!newExpandedNodes[nodeKey]) {
            onToggleExpanded(nodeKey)
          }
        })
      }
    } else {
      // Restore original state when search is cleared
      if (Object.keys(originalExpandedState).length > 0 && onToggleExpanded) {
        const currentKeys = Object.keys(expandedNodes).sort()
        const originalKeys = Object.keys(originalExpandedState).sort()
        const isDifferent = currentKeys.length !== originalKeys.length ||
          currentKeys.some((key, index) => key !== originalKeys[index]) ||
          currentKeys.some(key => expandedNodes[key] !== originalExpandedState[key])
        
        if (isDifferent) {
          // Restore original state
          Object.keys(originalExpandedState).forEach(nodeKey => {
            if (!expandedNodes[nodeKey]) {
              onToggleExpanded(nodeKey)
            }
          })
          Object.keys(expandedNodes).forEach(nodeKey => {
            if (!originalExpandedState[nodeKey]) {
              onToggleExpanded(nodeKey)
            }
          })
        }
      }
      
      setOriginalExpandedState({})
    }
  }, [searchQuery, filteredHierarchy, onToggleExpanded])

  // Memoized TreeNode component to prevent unnecessary re-renders
  const TreeNode = React.memo(({ node, depth = 0, path = '' }) => {
    const nodeKey = path || `root-${node.name}`
    const hasChildren = node.children && node.children.length > 0
    const isLeaf = !hasChildren && node.mids
    const isExpandedValue = isExpanded(nodeKey)
    
    // Memoize the click handler to prevent re-renders
    const handleToggle = React.useCallback(() => {
      if (hasChildren && onToggleExpanded) {
        onToggleExpanded(nodeKey)
      }
    }, [hasChildren, nodeKey, onToggleExpanded])
    
    // Memoize the chevron rotation to prevent re-renders
    const chevronRotation = React.useMemo(() => 
      isExpandedValue ? 90 : 0, [isExpandedValue]
    )
    
    return (
      <div className={`${depth > 0 ? `pl-${depth * 4}` : ''}`}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-2">
          {/* Node Header */}
          <div 
            className="flex items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={handleToggle}
          >
            <div className="flex items-center flex-1">
              {hasChildren && (
                <motion.div
                  animate={{ rotate: chevronRotation }}
                  transition={{ duration: 0.2 }}
                  className="mr-3"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.div>
              )}
              <span className="font-semibold text-gray-900">{getDisplayLabel(node.name)}</span>
              <span className="ml-2 text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded-full">
                {node.count || 0} {isLeaf ? 'MIDs' : 'items'}
              </span>
            </div>
          </div>

          {/* MIDs for leaf nodes */}
          {isLeaf && node.mids && (
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-1">
                {node.mids.map((mid, index) => (
                  <span 
                    key={index} 
                    className="text-xs text-gray-700 font-mono bg-blue-50 px-2 py-1 rounded-lg"
                  >
                    {mid}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Node Children */}
          {hasChildren && (
            <AnimatePresence>
              {isExpandedValue && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border-t border-gray-100"
                >
                  <div className="p-4 space-y-2">
                    {node.children.map((child, index) => (
                      <TreeNode 
                        key={`${child.name}-${index}`}
                        node={child} 
                        depth={depth + 1}
                        path={`${nodeKey}-${index}`}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    )
  })

  if (!hierarchyData || Object.keys(hierarchyData).length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Pagos Hierarchy Visualization</h3>
          <p className="text-sm text-gray-600">Upload a CSV file to see your hierarchy</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search tiers or MIDs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="mt-2 text-xs text-gray-600">
            {Object.keys(filteredHierarchy).length > 0 
              ? `Found ${Object.keys(filteredHierarchy).length} matching tier${Object.keys(filteredHierarchy).length === 1 ? '' : 's'}`
              : 'No matches found'
            }
          </div>
        )}
      </div>

      {/* Hierarchy Tree */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          {filteredHierarchy.length === 0 && searchQuery ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-gray-500">No results found for "{searchQuery}"</p>
              <p className="text-sm text-gray-400 mt-1">Try searching for tier names or MID values</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHierarchy.map((node, index) => (
                <TreeNode 
                  key={`${node.name}-${index}`}
                  node={node} 
                  depth={0}
                  path={`root-${index}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.hierarchyData === nextProps.hierarchyData &&
    prevProps.levelAliases === nextProps.levelAliases &&
    prevProps.expandedNodes === nextProps.expandedNodes &&
    prevProps.onToggleExpanded === nextProps.onToggleExpanded
  )
})

HierarchyTree.displayName = 'HierarchyTree'

export default HierarchyTree
