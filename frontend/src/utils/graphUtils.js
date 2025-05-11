/**
 * Transforms API data into the format expected by Cytoscape
 * with additional validation, error handling, and node existence checks
 * @param {Object} data - Graph data from API
 * @returns {Object} - Formatted data for Cytoscape
 */
export const formatGraphData = (data) => {
    try {
        const elements = { nodes: [], edges: [] };

        // Validate data structure
        if (!data || typeof data !== 'object') {
            console.error('Invalid graph data format:', data);
            return elements;
        }

        const { users = [], transactions = [], userRelationships = [] } = data;

        if (!Array.isArray(users) || !Array.isArray(transactions) || !Array.isArray(userRelationships)) {
            console.error('Invalid graph data arrays:', { users, transactions, userRelationships });
            return elements;
        }

        // Create a map for quick lookups to avoid duplicates
        const nodeMap = new Map();
        const edgeMap = new Map();

        // PHASE 1: First collect ALL nodes from ALL data sources to ensure they exist
        // This prevents the "nonexistant source/target" errors

        // Step 1a: Process main users array
        users.forEach(user => {
            if (!user || !user.id) return; // Skip invalid users
            const nodeId = `user-${user.id}`;
            if (!nodeMap.has(nodeId)) {
                nodeMap.set(nodeId, {
                    data: {
                        id: nodeId,
                        label: user.name || `User ${user.id}`,
                        type: 'user',
                        ...user
                    },
                    classes: 'user'
                });
            }
        });

        // Step 1b: Process main transactions array
        transactions.forEach(transaction => {
            if (!transaction || !transaction.id) return; // Skip invalid transactions
            const nodeId = `transaction-${transaction.id}`;
            if (!nodeMap.has(nodeId)) {
                nodeMap.set(nodeId, {
                    data: {
                        id: nodeId,
                        label: `Transaction ${transaction.id}`,
                        type: 'transaction',
                        ...transaction
                    },
                    classes: 'transaction'
                });
            }
        });

        // Step 1c: Process ALL potential nodes from relationships
        userRelationships.forEach(relationData => {
            if (!relationData || !relationData.user || !relationData.user.id) return;

            // Add the main user node
            const userId = relationData.user.id;
            const userNodeId = `user-${userId}`;
            if (!nodeMap.has(userNodeId)) {
                nodeMap.set(userNodeId, {
                    data: {
                        id: userNodeId,
                        label: relationData.user.name || `User ${userId}`,
                        type: 'user',
                        ...relationData.user
                    },
                    classes: 'user'
                });
            }

            // Add all connected user nodes
            if (Array.isArray(relationData.connectedUsers)) {
                relationData.connectedUsers.forEach(connection => {
                    if (!connection || !connection.user || !connection.user.id) return;

                    const connectedUserId = connection.user.id;
                    const connectedUserNodeId = `user-${connectedUserId}`;
                    if (!nodeMap.has(connectedUserNodeId)) {
                        nodeMap.set(connectedUserNodeId, {
                            data: {
                                id: connectedUserNodeId,
                                label: connection.user.name || `User ${connectedUserId}`,
                                type: 'user',
                                ...connection.user
                            },
                            classes: 'user'
                        });
                    }
                });
            }

            // Add all transaction nodes
            if (Array.isArray(relationData.transactions)) {
                relationData.transactions.forEach(txn => {
                    if (!txn || !txn.id) return;

                    const txnNodeId = `transaction-${txn.id}`;
                    if (!nodeMap.has(txnNodeId)) {
                        nodeMap.set(txnNodeId, {
                            data: {
                                id: txnNodeId,
                                label: `Transaction ${txn.id}`,
                                type: 'transaction',
                                ...txn
                            },
                            classes: 'transaction'
                        });
                    }
                });
            }

            // Add all target user nodes from transfers
            if (Array.isArray(relationData.directTransfers)) {
                relationData.directTransfers.forEach(transfer => {
                    if (!transfer || !transfer.targetUser || !transfer.targetUser.id) return;

                    const targetUserId = transfer.targetUser.id;
                    const targetUserNodeId = `user-${targetUserId}`;
                    if (!nodeMap.has(targetUserNodeId)) {
                        nodeMap.set(targetUserNodeId, {
                            data: {
                                id: targetUserNodeId,
                                label: transfer.targetUser.name || `User ${targetUserId}`,
                                type: 'user',
                                ...transfer.targetUser
                            },
                            classes: 'user'
                        });
                    }
                });
            }
        });

        // PHASE 2: Now add all the nodes to the elements array
        // Convert Map to array for cytoscape
        elements.nodes = Array.from(nodeMap.values());

        // Log the node count for debugging
        console.log(`Created ${elements.nodes.length} nodes`);

        // PHASE 3: Create all edges, verifying that both source and target nodes exist
        userRelationships.forEach(relationData => {
            if (!relationData || !relationData.user || !relationData.user.id) return;

            const userId = relationData.user.id;
            const userNodeId = `user-${userId}`;

            // Skip if the source node doesn't exist (which it should by now)
            if (!nodeMap.has(userNodeId)) {
                console.warn(`Skipping relationships for missing user node: ${userNodeId}`);
                return;
            }

            // Process connected users
            if (Array.isArray(relationData.connectedUsers)) {
                relationData.connectedUsers.forEach((connection, index) => {
                    if (!connection || !connection.user || !connection.user.id || !connection.relationship) return;

                    const connectedUserId = connection.user.id;
                    const connectedUserNodeId = `user-${connectedUserId}`;

                    // Skip if target node doesn't exist
                    if (!nodeMap.has(connectedUserNodeId)) {
                        console.warn(`Skipping edge to missing connected user node: ${connectedUserNodeId}`);
                        return;
                    }

                    const relType = connection.relationship.type || 'CONNECTED';
                    const edgeId = `edge-user-${userId}-${connectedUserId}-${index}`;

                    // Avoid duplicate edges
                    if (!edgeMap.has(edgeId)) {
                        elements.edges.push({
                            data: {
                                id: edgeId,
                                source: userNodeId,
                                target: connectedUserNodeId,
                                label: relType,
                                relationshipType: relType,
                                properties: connection.relationship.properties || {}
                            },
                            classes: 'user-user'
                        });
                        edgeMap.set(edgeId, true);
                    }
                });
            }

            // Process transactions
            if (Array.isArray(relationData.transactions)) {
                relationData.transactions.forEach((txn, index) => {
                    if (!txn || !txn.id) return;

                    const txnNodeId = `transaction-${txn.id}`;

                    // Skip if target node doesn't exist
                    if (!nodeMap.has(txnNodeId)) {
                        console.warn(`Skipping edge to missing transaction node: ${txnNodeId}`);
                        return;
                    }

                    const edgeId = `edge-user-${userId}-transaction-${txn.id}-${index}`;

                    // Avoid duplicate edges
                    if (!edgeMap.has(edgeId)) {
                        elements.edges.push({
                            data: {
                                id: edgeId,
                                source: userNodeId,
                                target: txnNodeId,
                                label: 'INVOLVED_IN',
                                relationshipType: 'INVOLVED_IN'
                            },
                            classes: 'user-transaction'
                        });
                        edgeMap.set(edgeId, true);
                    }
                });
            }

            // Process direct transfers
            if (Array.isArray(relationData.directTransfers)) {
                relationData.directTransfers.forEach((transfer, index) => {
                    if (!transfer || !transfer.targetUser || !transfer.targetUser.id) return;

                    const targetUserId = transfer.targetUser.id;
                    const targetUserNodeId = `user-${targetUserId}`;

                    // Skip if target node doesn't exist
                    if (!nodeMap.has(targetUserNodeId)) {
                        console.warn(`Skipping edge to missing target user node: ${targetUserNodeId}`);
                        return;
                    }

                    const relType = transfer.type || 'TRANSFER';
                    const edgeId = `edge-transfer-${userId}-${targetUserId}-${index}`;

                    // Avoid duplicate edges
                    if (!edgeMap.has(edgeId)) {
                        elements.edges.push({
                            data: {
                                id: edgeId,
                                source: userNodeId,
                                target: targetUserNodeId,
                                label: relType,
                                relationshipType: relType,
                                amount: transfer.amount,
                                currency: transfer.currency
                            },
                            classes: 'transfer'
                        });
                        edgeMap.set(edgeId, true);
                    }
                });
            }
        });

        console.log(`Generated ${elements.nodes.length} nodes and ${elements.edges.length} edges`);
        return elements;

    } catch (error) {
        console.error('Error formatting graph data:', error);
        return { nodes: [], edges: [] };
    }
};


/**
 * Gets the improved style for the Cytoscape graph with better visibility and contrast
 * @returns {Array} - Cytoscape style array
 */
export const getImprovedGraphStylesheet = () => [
    {
        selector: 'node',
        style: {
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'text-wrap': 'wrap',
            'text-max-width': '100px',
            'font-size': '12px',
            'font-weight': 'bold',
            'text-opacity': 1,
            'color': '#333',
            'text-outline-width': 2,
            'text-outline-color': '#fff',
            'text-background-opacity': 0.8,
            'text-background-color': '#fff',
            'text-background-padding': '3px',
            'background-color': '#5C6BC0',
            'width': '45px',
            'height': '45px',
            'border-width': 0,
            'border-color': '#FFC107'
        }
    },
    {
        selector: 'node.user',
        style: {
            'background-color': '#42A5F5', // Bright blue
            'shape': 'ellipse',
            'text-background-color': '#E3F2FD',
        }
    },
    {
        selector: 'node.transaction',
        style: {
            'background-color': '#FF7043', // Orange
            'shape': 'diamond',
            'text-background-color': '#FBE9E7',
            'width': '40px',
            'height': '40px'
        }
    },
    {
        selector: 'edge',
        style: {
            'width': 2,
            'line-color': '#78909C',
            'target-arrow-color': '#78909C',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '10px',
            'text-rotation': 'autorotate',
            'text-margin-y': '-10px',
            'text-background-opacity': 1,
            'text-background-color': '#fff',
            'text-background-padding': '2px',
            'color': '#333',
            'arrow-scale': 1.5,
            'source-endpoint': '0% 0%',
            'target-endpoint': '0% 0%',
            'edge-text-rotation': 'autorotate'
        }
    },
    {
        selector: 'edge.user-user',
        style: {
            'line-color': '#42A5F5',
            'target-arrow-color': '#42A5F5',
            'width': 2
        }
    },
    {
        selector: 'edge.user-transaction',
        style: {
            'line-color': '#FF7043',
            'target-arrow-color': '#FF7043',
            'width': 2
        }
    },
    {
        selector: 'edge.transfer',
        style: {
            'line-color': '#FFC107',
            'target-arrow-color': '#FFC107',
            'width': 3,
            'text-background-color': '#FFF9C4',
        }
    },
    {
        selector: 'edge[relationshipType="SHARES_ADDRESS"]',
        style: {
            'line-color': '#66BB6A',
            'target-arrow-color': '#66BB6A',
            'line-style': 'dashed',
            'width': 2
        }
    },
    {
        selector: 'edge[relationshipType="SHARES_PHONE"]',
        style: {
            'line-color': '#9575CD',
            'target-arrow-color': '#9575CD',
            'line-style': 'dashed',
            'width': 2
        }
    },
    {
        selector: 'edge[relationshipType="SHARES_EMAIL"]',
        style: {
            'line-color': '#FF9800',
            'target-arrow-color': '#FF9800',
            'line-style': 'dashed',
            'width': 2
        }
    },
    {
        selector: 'edge[relationshipType="SHARES_PAYMENT_METHOD"]',
        style: {
            'line-color': '#8D6E63',
            'target-arrow-color': '#8D6E63',
            'line-style': 'dashed',
            'width': 2
        }
    },
    // Add highlighted and faded styles for node selection
    {
        selector: '.highlighted',
        style: {
            'background-color': '#FFC107',
            'line-color': '#FFC107',
            'target-arrow-color': '#FFC107',
            'transition-property': 'background-color, line-color, target-arrow-color',
            'transition-duration': '0.3s',
            'z-index': 999,
            'width': 'mapData(foo, 0, 10, 50, 50)',
            'height': 'mapData(foo, 0, 10, 50, 50)',
            'border-width': 3,
            'border-color': '#FF6F00',
            'font-size': '14px',
            'font-weight': 'bold',
            'text-background-color': '#FFF9C4',
        }
    },
    {
        selector: '.highlighted.user',
        style: {
            'background-color': '#1E88E5',
        }
    },
    {
        selector: '.highlighted.transaction',
        style: {
            'background-color': '#F4511E',
        }
    },
    {
        selector: '.faded',
        style: {
            'opacity': 0.2,
            'transition-property': 'opacity',
            'transition-duration': '0.3s'
        }
    }
];

