import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Papa from 'papaparse'
import HierarchyTree from './HierarchyTree'

function App() {
  const [parsedData, setParsedData] = useState([])
  const [columns, setColumns] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [columnMappings, setColumnMappings] = useState({
    levels: [],
    midColumn: undefined,
    levelAliases: {}
  })
  const [expandedNodes, setExpandedNodes] = useState({})

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    setIsLoading(true)
    setError('')
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`CSV parsing error: ${results.errors[0].message}`)
          setIsLoading(false)
          return
        }
        
        setParsedData(results.data)
        const newColumns = Object.keys(results.data[0] || {})
        setColumns(newColumns)
        
        // Auto-detect plausible columns and set default mapping
        const autoDetectedMapping = autoDetectColumns(newColumns, results.data)
        setColumnMappings(autoDetectedMapping)
        setIsLoading(false)
      },
      error: (error) => {
        setError(`File reading error: ${error.message}`)
        setIsLoading(false)
      }
    })
  }

  const handleDrop = (event) => {
    event.preventDefault()
    const files = event.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        const fakeEvent = { target: { files: [file] } }
        handleFileUpload(fakeEvent)
      } else {
        setError('Please upload a CSV file')
      }
    }
  }

  const handleDragOver = (event) => {
    event.preventDefault()
  }

  const handleColumnMappingChange = (mappingType, value) => {
    if (mappingType === 'levels') {
      setColumnMappings(prev => ({
        ...prev,
        levels: value
      }))
    } else if (mappingType === 'midColumn') {
      setColumnMappings(prev => ({
        ...prev,
        midColumn: value || undefined
      }))
    }
  }

  const addLevel = () => {
    setColumnMappings(prev => ({
      ...prev,
      levels: [...prev.levels, '']
    }))
  }

  const removeLevel = (index) => {
    setColumnMappings(prev => ({
      ...prev,
      levels: prev.levels.filter((_, i) => i !== index)
    }))
  }

  const updateLevel = (index, value) => {
    setColumnMappings(prev => ({
      ...prev,
      levels: prev.levels.map((level, i) => i === index ? value : level)
    }))
  }

  const updateLevelAlias = (levelName, alias) => {
    setColumnMappings(prev => ({
      ...prev,
      levelAliases: {
        ...prev.levelAliases,
        [levelName]: alias
      }
    }))
  }

  // Check for duplicate selections
  const hasDuplicateSelections = () => {
    const { levels, midColumn } = columnMappings
    const allSelections = [...levels.filter(Boolean), midColumn].filter(Boolean)
    return allSelections.length !== new Set(allSelections).size
  }

  // Check if midColumn is also selected as a level
  const isMidColumnInLevels = () => {
    const { levels, midColumn } = columnMappings
    return midColumn && levels.includes(midColumn)
  }

  // Check for duplicate aliases
  const getDuplicateAliases = () => {
    const { levelAliases } = columnMappings
    const aliasValues = Object.values(levelAliases).filter(Boolean)
    const duplicates = aliasValues.filter((alias, index) => 
      aliasValues.indexOf(alias) !== index
    )
    return [...new Set(duplicates)]
  }

  const autoDetectColumns = (columns, data) => {
    // Simple auto-detection: use first column as default level
    // In a real implementation, this could be more sophisticated
    const defaultLevels = columns.length > 0 ? [columns[0]] : []
    
    return {
      levels: defaultLevels,
      midColumn: undefined,
      levelAliases: {}
    }
  }

  // Generic hierarchy builder
  const buildHierarchy = (rows, levels, midColumn) => {
    if (!rows || rows.length === 0) return []
    
    // Group rows by the first level
    const groups = {}
    rows.forEach(row => {
      const firstLevelValue = row[levels[0]]?.trim() || '—'
      if (!groups[firstLevelValue]) {
        groups[firstLevelValue] = []
      }
      groups[firstLevelValue].push(row)
    })
    
    // Process each group
    const nodes = Object.entries(groups).map(([groupName, groupRows]) => {
      if (levels.length === 1) {
        // This is a leaf node
        if (midColumn) {
          // Use midColumn for MIDs
          const mids = [...new Set(groupRows.map(row => row[midColumn]?.trim()).filter(Boolean))]
          return {
            name: groupName,
            mids: mids,
            count: mids.length
          }
        } else {
          // Use the group name as MID
          return {
            name: groupName,
            mids: [groupName],
            count: 1
          }
        }
      } else {
        // Recurse with remaining levels
        const childNodes = buildHierarchy(groupRows, levels.slice(1), midColumn)
        const totalCount = childNodes.reduce((sum, child) => sum + (child.count || 0), 0)
        
        return {
          name: groupName,
          children: childNodes,
          count: totalCount
        }
      }
    })
    
    // Sort alphabetically by name
    return nodes.sort((a, b) => a.name.localeCompare(b.name))
  }

  // Validation functions
  const validateMapping = () => {
    const errors = []
    const warnings = []
    
    // Check for required levels
    if (columnMappings.levels.length === 0) {
      errors.push('Select at least one level.')
    }
    
    // Check for duplicates
    if (hasDuplicateSelections()) {
      errors.push('Duplicate headers across levels or with MID.')
    }
    
    // Check for duplicate aliases
    const duplicateAliases = getDuplicateAliases()
    if (duplicateAliases.length > 0) {
      warnings.push(`Duplicate alias names may cause confusion in preview: ${duplicateAliases.join(', ')}.`)
    }
    
    // Check for empty values
    if (parsedData.length > 0 && columnMappings.levels.length > 0) {
      const emptyValueCounts = {}
      columnMappings.levels.forEach(level => {
        const emptyCount = parsedData.filter(row => !row[level]?.trim()).length
        if (emptyCount > 0) {
          emptyValueCounts[level] = emptyCount
        }
      })
      
      if (columnMappings.midColumn) {
        const emptyMidCount = parsedData.filter(row => !row[columnMappings.midColumn]?.trim()).length
        if (emptyMidCount > 0) {
          emptyValueCounts[columnMappings.midColumn] = emptyMidCount
        }
      }
      
      Object.entries(emptyValueCounts).forEach(([column, count]) => {
        warnings.push(`${count} rows missing ${column}; grouped under '—'.`)
      })
    }
    
    return { errors, warnings }
  }

  // Memoize hierarchy data to prevent unnecessary re-renders
  const memoizedHierarchyData = React.useMemo(() => {
    if (!parsedData.length || columnMappings.levels.length === 0) {
      return null
    }
    
    // Build hierarchy using new function
    const hierarchyNodes = buildHierarchy(
      parsedData,
      columnMappings.levels,
      columnMappings.midColumn
    )
    
    // Wrap with virtual root node
    const totalCount = hierarchyNodes.reduce((sum, node) => sum + (node.count || 0), 0)
    return {
      name: 'All Accounts',
      children: hierarchyNodes,
      count: totalCount
    }
  }, [parsedData, columnMappings.levels, columnMappings.midColumn])

  // Memoize levelAliases to prevent unnecessary re-renders
  const memoizedLevelAliases = React.useMemo(() => {
    return columnMappings.levelAliases || {}
  }, [columnMappings.levelAliases])

  // Memoize the toggle function to prevent unnecessary re-renders
  const memoizedToggleExpanded = React.useCallback((nodeKey) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeKey]: !prev[nodeKey]
    }))
  }, [])

  const handleGenerateVisualization = () => {
    if (!parsedData.length || columnMappings.levels.length === 0) {
      return
    }
    
    const validation = validateMapping()
    if (validation.errors.length > 0) {
      setError(validation.errors.join(' '))
      return
    }
    
    // Clear previous errors
    setError('')
    
    // Hierarchy data is now directly passed to component
    
    // Log to console for debugging
    console.log('Generated Hierarchy Data:', memoizedHierarchyData)
    console.log('Column Mappings:', columnMappings)
    console.log('Validation warnings:', validation.warnings)
  }

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {/* Main Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <motion.h1 
              className="text-3xl font-semibold text-gray-900"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Pagos Hierarchy Visualizer
            </motion.h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="bg-gray-50 min-h-[calc(100vh-120px)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[600px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
          {/* Left Column - Input Panel */}
          <motion.div
            className="bg-gray-100 rounded-2xl shadow-lg border border-gray-200 p-6 flex flex-col"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="flex flex-col h-full">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Input Panel</h2>
                <p className="text-sm text-gray-600">Upload and configure your hierarchical data</p>
              </div>
              
              {/* File Upload Section */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">File Upload</h3>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => document.getElementById('csv-upload').click()}
                >
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  
                  {isLoading ? (
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                      <p className="text-sm text-gray-600">Parsing CSV...</p>
                    </div>
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      <p className="text-sm text-gray-600 mb-2">Drop your CSV file here or click to browse</p>
                      <p className="text-xs text-gray-500">Supports .csv files up to 10MB</p>
                    </>
                  )}
                </div>
                
                {error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-2xl">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
              </div>
              
              {/* Data Preview Section */}
              {parsedData.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Data Preview</h3>
                  <div className="bg-white rounded-2xl p-4 max-h-48 overflow-auto shadow-sm border border-gray-200">
                    <div className="text-xs text-gray-500 mb-2">
                      Showing first 5 rows of {parsedData.length} total rows
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-300">
                            {columns.map((column, index) => (
                              <th key={index} className="text-left py-1 px-2 font-medium text-gray-700">
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {parsedData.slice(0, 5).map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b border-gray-200">
                              {columns.map((column, colIndex) => (
                                <td key={colIndex} className="py-1 px-2 text-gray-600">
                                  {row[column] || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Column Mapping Section */}
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Column Mapping</h3>
                
                {/* Hierarchy Levels Section */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-600">Hierarchy Levels</label>
                    <button
                      onClick={addLevel}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Level
                    </button>
                  </div>
                  
                  {columnMappings.levels.map((level, index) => {
                    // Get available columns (exclude already selected ones and midColumn)
                    const availableColumns = columns.filter(col => {
                      const isSelectedInOtherLevels = columnMappings.levels.some((l, i) => i !== index && l === col)
                      const isMidColumn = col === columnMappings.midColumn
                      return !isSelectedInOtherLevels && !isMidColumn
                    })
                    
                    return (
                      <div key={index} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium text-gray-500 w-8">Level {index + 1}</span>
                            <select 
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              value={level}
                              onChange={(e) => updateLevel(index, e.target.value)}
                            >
                              <option value="">Select column...</option>
                              {availableColumns.map((column, colIndex) => (
                                <option key={colIndex} value={column}>{column}</option>
                              ))}
                            </select>
                            {columnMappings.levels.length > 1 && (
                              <button
                                onClick={() => removeLevel(index)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                          
                          {/* Alias Input - Hidden */}
                          <div className="hidden flex items-center space-x-2">
                            <span className="text-xs font-medium text-gray-500 w-8">Alias</span>
                            <input
                              type="text"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Alias (optional)"
                              value={columnMappings.levelAliases[level] || ''}
                              onChange={(e) => updateLevelAlias(level, e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* MID Column Mapping */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    MID Column (optional)
                  </label>
                  <select 
                    className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
                      isMidColumnInLevels() 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    value={columnMappings.midColumn || ''}
                    onChange={(e) => handleColumnMappingChange('midColumn', e.target.value)}
                  >
                    <option value="">Use last level as MID</option>
                    {columns
                      .filter(col => !columnMappings.levels.includes(col))
                      .map((column, index) => (
                        <option key={index} value={column}>{column}</option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    If not set, the last Level is treated as MID.
                  </p>
                  {isMidColumnInLevels() && (
                    <p className="text-xs text-red-600 mt-1">
                      A header cannot be both a level and MID.
                    </p>
                  )}
                </div>
                
                {/* Mapping Status */}
                {parsedData.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-2xl border border-blue-200">
                    <h4 className="text-xs font-medium text-blue-800 mb-2">Current Mappings:</h4>
                    <div className="text-xs text-blue-700 space-y-1">
                      <div>
                        <span className="font-medium">Levels:</span> [
                        {columnMappings.levels.length > 0 
                          ? columnMappings.levels.map(level => {
                              const alias = columnMappings.levelAliases[level]
                              return alias ? `${level} → ${alias}` : level
                            }).join(' > ')
                          : 'None selected'
                        }]
                      </div>
                      <div>
                        <span className="font-medium">MID:</span> {
                          columnMappings.midColumn 
                            ? columnMappings.midColumn 
                            : '(last level)'
                        }
                      </div>
                      {hasDuplicateSelections() && (
                        <div className="text-red-600 font-medium">
                          ⚠️ Duplicate selections detected
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Validation Messages */}
                {parsedData.length > 0 && (() => {
                  const validation = validateMapping()
                  return (
                    <div className="mt-4 space-y-2">
                      {validation.errors.length > 0 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
                          <div className="text-sm text-red-800 font-medium mb-1">Errors:</div>
                          {validation.errors.map((error, index) => (
                            <div key={index} className="text-sm text-red-700">• {error}</div>
                          ))}
                        </div>
                      )}
                      {validation.warnings.length > 0 && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-2xl">
                          <div className="text-sm text-yellow-800 font-medium mb-1">Warnings:</div>
                          {validation.warnings.map((warning, index) => (
                            <div key={index} className="text-sm text-yellow-700">• {warning}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}

                <div className="mt-6">
                  <button 
                    className={`w-full py-3 px-4 rounded-2xl text-sm font-medium transition-all duration-200 shadow-sm ${
                      parsedData.length > 0 && columnMappings.levels.length > 0 && !hasDuplicateSelections() && !isMidColumnInLevels()
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={parsedData.length === 0 || columnMappings.levels.length === 0 || hasDuplicateSelections() || isMidColumnInLevels()}
                    onClick={handleGenerateVisualization}
                  >
                    Generate Visualization
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Hierarchy Preview */}
          <motion.div
            className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 flex flex-col"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="flex flex-col h-full">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Hierarchy Preview</h2>
                <p className="text-sm text-gray-600">Interactive visualization of your data</p>
              </div>
              
              {/* Visualization Container */}
              <div className="flex-1 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <HierarchyTree 
                  key={`hierarchy-${JSON.stringify(columnMappings.levels)}-${columnMappings.midColumn}`}
                  hierarchyData={memoizedHierarchyData} 
                  levelAliases={memoizedLevelAliases}
                  expandedNodes={expandedNodes}
                  onToggleExpanded={memoizedToggleExpanded}
                />
              </div>
            </div>
          </motion.div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-center items-center">
            <p className="text-sm text-gray-500">
              Built for <span className="font-semibold text-gray-700">Pagos</span>
            </p>
          </div>
        </div>
      </footer>

    </div>
  )
}

export default App
