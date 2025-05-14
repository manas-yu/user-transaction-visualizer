import { useEffect, useState, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { getCompleteGraph } from '../services/api';
import { formatGraphData, getGraphStylesheet } from '../utils/graphUtils';
import ErrorBoundary from './ErrorBoundary';
import './Graph.css';

// Register the layout extension
cytoscape.use(fcose);

const Graph = () => {
    const [elements, setElements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dataStats, setDataStats] = useState({ nodes: 0, edges: 0 });
    const [selectedNode, setSelectedNode] = useState(null);
    const cyRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            try {
                setLoading(true);
                const data = await getCompleteGraph();

                // Validate the data structure
                if (!data) {
                    throw new Error('No data received from API');
                }

                console.log('Raw API data received:', {
                    usersCount: data.users?.length || 0,
                    transactionsCount: data.transactions?.length || 0,
                    userRelationshipsCount: data.userRelationships?.length || 0
                });

                // Format the data for Cytoscape - this returns {nodes: [], edges: []}
                const formattedData = formatGraphData(data);

                if (!isMounted) return;

                if (!formattedData || !formattedData.nodes || !formattedData.edges) {
                    throw new Error('Failed to format graph data properly');
                }

                // Set statistics for potential display
                setDataStats({
                    nodes: formattedData.nodes.length,
                    edges: formattedData.edges.length
                });

                // Verify we have data to display
                if (formattedData.nodes.length === 0) {
                    setError('No nodes available to display in the graph');
                    setLoading(false);
                    return;
                }

                // Perform validation to check for source/target node existence
                const nodesSet = new Set(formattedData.nodes.map(node => node.data.id));
                const validEdges = formattedData.edges.filter(edge =>
                    nodesSet.has(edge.data.source) && nodesSet.has(edge.data.target)
                );

                const invalidEdges = formattedData.edges.filter(edge =>
                    !nodesSet.has(edge.data.source) || !nodesSet.has(edge.data.target)
                );

                if (invalidEdges.length > 0) {
                    console.log(`Filtered out ${invalidEdges.length} invalid edges. Using ${validEdges.length} valid edges.`);
                    formattedData.edges = validEdges;
                }

                // Convert to the array format required by CytoscapeComponent
                const elementArray = [
                    ...formattedData.nodes,
                    ...formattedData.edges
                ];

                console.log(`Formatted ${elementArray.length} elements for Cytoscape`);

                // Set elements only if we have some data
                if (elementArray.length > 0) {
                    setElements(elementArray);
                } else {
                    setError('No graph data available to display');
                }

                setLoading(false);
            } catch (err) {
                console.error('Error processing graph data:', err);

                if (!isMounted) return;

                setError(`Failed to load graph data: ${err.message}`);
                setLoading(false);
            }
        };

        fetchData();

        // Cleanup function for when component unmounts
        return () => {
            isMounted = false;

            // Clean up Cytoscape instance if it exists
            if (cyRef.current) {
                try {
                    cyRef.current.removeAllListeners();
                } catch (e) {
                    console.warn('Error during Cytoscape cleanup:', e);
                }
            }
        };
    }, []);

    const handleNodeClick = (event) => {
        try {
            const node = event.target;
            console.log('Node clicked:', node.data());
            setSelectedNode(node.data());

            // Highlight the node and its connections
            if (cyRef.current) {
                const cy = cyRef.current;

                // Reset all elements
                cy.elements().removeClass('highlighted');
                cy.elements().removeClass('faded');

                // Highlight the selected node and its connections
                const selectedNode = cy.getElementById(node.id());
                if (selectedNode && selectedNode.length > 0) {
                    const connectedEdges = selectedNode.connectedEdges();
                    const connectedNodes = connectedEdges.connectedNodes();

                    selectedNode.addClass('highlighted');
                    connectedEdges.addClass('highlighted');
                    connectedNodes.addClass('highlighted');

                    // Fade the rest
                    cy.elements().difference(selectedNode.union(connectedEdges).union(connectedNodes)).addClass('faded');
                }
            }
        } catch (err) {
            console.error('Error handling node click:', err);
        }
    };

    // Clear selection when clicking on background
    const handleBackgroundClick = () => {
        setSelectedNode(null);
        if (cyRef.current) {
            cyRef.current.elements().removeClass('highlighted');
            cyRef.current.elements().removeClass('faded');
        }
    };

    // Reset zoom and center the graph
    const resetView = () => {
        if (cyRef.current) {
            cyRef.current.fit();
            cyRef.current.center();
        }
    };

    // Show a loading state with stats
    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-text">Loading graph data...</div>
            </div>
        );
    }

    // Show error with details
    if (error) {
        return (
            <div className="error-container">
                <div className="error-message">
                    <h3>Server Issue</h3>
                    <p style={{ color: 'black' }}>{error}</p>
                    <button className="retry-button" onClick={() => window.location.reload()}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Make sure we have data before rendering
    if (!elements || elements.length === 0) {
        return <div className="empty-state">No graph data available to display.</div>;
    }

    // Define layout here for clarity
    const layout = {
        name: 'fcose',
        animate: true,
        animationDuration: 500,
        fit: true,
        padding: 50,
        nodeDimensionsIncludeLabels: true,
        idealEdgeLength: 120,
        nodeRepulsion: 5500,
        edgeElasticity: 0.45,
        // Updated to fix isHeadless issue:
        randomize: true,
    };

    const cytoscapeRenderOptions = {
        elements: elements,
        style: getGraphStylesheet(),
        layout: { name: 'preset' },
        maxZoom: 5,
        minZoom: 0.1,
        wheelSensitivity: 0.2,
        userZoomingEnabled: true,
        userPanningEnabled: true,
        boxSelectionEnabled: true,
        autounselectify: false,
        styleEnabled: true
    };

    return (
        <div className="graph-container">
            <div className="graph-header">
                <div className="graph-stats">
                    <span className="stats-item">Nodes: {dataStats.nodes}</span>
                    <span className="stats-item">Edges: {dataStats.edges}</span>
                </div>
                <div className="graph-controls">
                    <button className="control-button" onClick={resetView}>
                        Reset View
                    </button>
                </div>
            </div>

            <div className="graph-panel">
                <div
                    className="cytoscape-container"
                    ref={containerRef}
                >
                    <ErrorBoundary>
                        <CytoscapeComponent
                            {...cytoscapeRenderOptions}
                            style={{ width: '100%', height: '100%' }}
                            cy={(cy) => {
                                cyRef.current = cy;

                                // Remove any existing handlers to prevent duplicates
                                cy.removeAllListeners();

                                // Add event handlers
                                cy.on('tap', 'node', handleNodeClick);
                                cy.on('tap', function (event) {
                                    if (event.target === cy) {
                                        handleBackgroundClick();
                                    }
                                });

                                // Add mouseover effects for better interaction
                                cy.on('mouseover', 'node', function (e) {
                                    e.target.style('border-width', '3px');
                                    e.target.style('border-color', '#FFC107');
                                    e.target.style('cursor', 'pointer');
                                });

                                cy.on('mouseout', 'node', function (e) {
                                    e.target.style('border-width', '0px');
                                });

                                // Wait for the component to be properly mounted and rendered
                                setTimeout(() => {
                                    try {
                                        // Only run layout if we have elements
                                        if (cy.elements().length > 0) {
                                            // Run layout with safeguards
                                            const safeLayout = {
                                                ...layout,
                                                // Set sensible defaults for dimensions
                                                boundingBox: {
                                                    x1: 0,
                                                    y1: 0,
                                                    w: containerRef.current?.offsetWidth || 800,
                                                    h: containerRef.current?.offsetHeight || 600
                                                }
                                            };

                                            cy.layout(safeLayout).run();
                                        }
                                    } catch (err) {
                                        console.error('Layout error:', err);
                                        // Fallback to simple cose layout on error
                                        try {
                                            cy.layout({
                                                name: 'cose',
                                                animate: false,
                                                fit: true
                                            }).run();
                                        } catch (e) {
                                            console.error('Fallback layout also failed:', e);
                                            try {
                                                cy.layout({ name: 'grid' }).run();
                                            } catch (final) {
                                                console.error('All layouts failed' + final);
                                            }
                                        }
                                    }
                                }, 300);
                            }}
                        />
                    </ErrorBoundary>
                </div>

                {selectedNode && (
                    <div className="node-details-panel">
                        <h3>{selectedNode.label}</h3>
                        <div className="node-type">Type: {selectedNode.type}</div>
                        <div className="node-id">ID: {selectedNode.id}</div>
                        {selectedNode.type === 'user' && (
                            <div className="user-details">
                                {selectedNode.email && <div>Email: {selectedNode.email}</div>}
                                {selectedNode.phone && <div>Phone: {selectedNode.phone}</div>}
                            </div>
                        )}
                        {selectedNode.type === 'transaction' && (
                            <div className="transaction-details">
                                {selectedNode.amount && <div>Amount: {selectedNode.amount} {selectedNode.currency || ''}</div>}
                                {selectedNode.date && <div>Date: {new Date(selectedNode.date).toLocaleDateString()}</div>}
                            </div>
                        )}
                        <button className="close-details" onClick={handleBackgroundClick}>Close</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Graph;