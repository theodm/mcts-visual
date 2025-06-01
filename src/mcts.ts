import { getCurrentPlayer, getPossibleNextStates, getResultMap, isTerminal } from "./tic_tac_toe";
import { cloneTreeNode, forAllNodes, type TreeNode } from "./TreeNode";

function uct(node: TreeNode, explorationConstant: number): number {
    if (node.parent === null) {
        return 0;
    }

    if (node.visits === 0) {
        return Infinity; 
    }

    return (
        node.value / node.visits +
        explorationConstant * Math.sqrt(Math.log(node.parent!.visits) / node.visits)
    );
}

function find_best_child(
    node: TreeNode,
    explorationConstant: number
): TreeNode {
    let best_child: TreeNode | null = null;
    let best_uct: number = -Infinity;

    for (const child of node.children) {
        const _uct = uct(child, explorationConstant);

        if (_uct > best_uct) {
            best_uct = _uct;
            best_child = child;
        }
    }

    if (!best_child) {
        throw new Error("No children found for the node.");
    }

    return best_child;
}


function selectPromisingNode(
    _node: TreeNode,

    explorationConstant: number
): TreeNode {
    let node: TreeNode | null = _node;

    node.isNodeSelected = true;
    node.isExpanded = true;
    while (node.children.length > 0) {
        node = find_best_child(node, explorationConstant);

        node.isNodeSelected = true;
        node.isEdgeSelected = true;
        node.isHighlightUCTOnly = true;
        node.isExpanded = true;
    }

    return node;
}

function simulate(node: TreeNode): string {
    let currentState = node.state;

    while (!isTerminal(currentState)) {
        const possibleNextStates = getPossibleNextStates(currentState);
        const randomIndex = Math.floor(Math.random() * possibleNextStates.length);

        currentState = possibleNextStates[randomIndex];
    }

    return currentState;
}


export interface MCTSStepResult {
    state: 'Start' | 'Selection' | 'Expansion' | 'Simulation' | 'Backpropagation' | 'Done';

    node: TreeNode;

    iteration: number;
}

function backpropagate(
    node: TreeNode,

    resultState: string
) {
    let currentNode: TreeNode | null = node;

    let result = getResultMap(resultState);

    while (currentNode !== null) {
        let parentNode: TreeNode | null = currentNode.parent;

        currentNode.isEdgeSelected = true;
        currentNode.isNodeSelected = true;
        currentNode.isHighlightVisitsValueUCT = true;

        currentNode.visits += 1;

        if (parentNode === null) {
            break;
        }

        currentNode.value += getCurrentPlayer(parentNode.state) === 'X' ? result.X : result.O;

        currentNode = parentNode;
    }
}



export function* mcts_search(
    state: string,

    iterations: number = 1000,
    explorationConstant: number = Math.sqrt(2),
): Generator<MCTSStepResult, MCTSStepResult, MCTSStepResult> {
    function prepareTree(
        node: TreeNode
    ) {
        forAllNodes(node, (n) => {
            n.uctValue = uct(n, explorationConstant);
            if (n.visits > 0) {
                n.realValue = n.value / n.visits;
            } else {
                n.realValue = 0;
            }
        });

        return cloneTreeNode(node);
    }

    let rootNode: TreeNode = {
        parent: null,
        state: state,
        isEdgeSelected: false,
        isNodeSelected: false,
        isHighlightUCTOnly: false,
        isHighlightVisitsValueUCT: false,
        realValue: 0,
        children: [],
        isSimulationNode: false,
        visits: 0,
        uctValue: 0,
        value: 0,
        isExpanded: true,

        player: getCurrentPlayer(state),
    }; 

    yield {
        state: 'Start',
        node: prepareTree(rootNode),
        iteration: 0,
    };

    for (let i = 0; i < iterations; i++) {
        forAllNodes(rootNode, (n) => {
            n.isExpanded = false;
            n.isEdgeSelected = false;
            n.isNodeSelected = false;
            n.isSimulationNode = false;
            n.isHighlightUCTOnly = false;
            n.isHighlightVisitsValueUCT = false;
        });
        rootNode.isExpanded = true;

        // Selection
        let nodeToExpand = selectPromisingNode(
            rootNode, 
            explorationConstant
        );

        nodeToExpand.isExpanded = true;

        yield {
            state: 'Selection',
            node: prepareTree(rootNode),
            iteration: i + 1,
        };

        let promisingNode: TreeNode | null = nodeToExpand;

        // Expansion
        if (!isTerminal(nodeToExpand.state)) {
            let possibleNextStates = getPossibleNextStates(nodeToExpand.state);

            for (const nextState of possibleNextStates) {
                const childNode: TreeNode = {
                    parent: nodeToExpand,
                    state: nextState,

                    isNodeSelected: false,
                    isEdgeSelected: false,
                    isHighlightUCTOnly: false,
                    isHighlightVisitsValueUCT: false,

                    realValue: 0,

                    children: [],
                    isSimulationNode: false,
                    
                    visits: 0,
                    uctValue: 0,
                    value: 0,

                    isExpanded: true,
                    player: getCurrentPlayer(nextState),
                };

                nodeToExpand.children.push(childNode);
            }            

            forAllNodes(rootNode, (n) => {
                n.isEdgeSelected = false;
                n.isNodeSelected = false;
                n.isHighlightUCTOnly = false;
            });

            nodeToExpand.isNodeSelected = true;

            for (const child of nodeToExpand.children) {
                child.isEdgeSelected = true;
                child.isNodeSelected = true;
                child.isHighlightUCTOnly = false;
            }

            yield {
                state: 'Expansion',
                node: prepareTree(rootNode),
                iteration: i + 1,
            };    

            promisingNode = nodeToExpand
                .children[Math.floor(Math.random() * nodeToExpand.children.length)];
        }

        let randomRolloutEndState = simulate(promisingNode);

        promisingNode.children.push({
            parent: promisingNode,
            state: randomRolloutEndState,
            isEdgeSelected: false,
            isNodeSelected: false,
            isHighlightUCTOnly: false,
            isHighlightVisitsValueUCT: false,
            realValue: 0,
            children: [],
            isSimulationNode: true,
            visits: 0,
            uctValue: 0,
            value: 0,
            isExpanded: true,
            player: getCurrentPlayer(randomRolloutEndState),
        });

        forAllNodes(rootNode, (n) => {
            n.isEdgeSelected = false;  
            n.isNodeSelected = false;
        });

        promisingNode.isNodeSelected = true;
        promisingNode.isEdgeSelected = true;

        nodeToExpand.isNodeSelected = true;

        yield {
            state: 'Simulation',
            node: prepareTree(rootNode),
            iteration: i + 1,
        }

        promisingNode.children = [];

        // Backpropagation
        let currentNode: TreeNode | null = promisingNode;

        forAllNodes(rootNode, (n) => {
            n.isEdgeSelected = false;  
            n.isNodeSelected = false;
        });

        backpropagate(currentNode, randomRolloutEndState);

        

        yield {
            state: 'Backpropagation',
            node: prepareTree(rootNode),
            iteration: i + 1,
        };
    }

    forAllNodes(rootNode, (n) => {
        n.isExpanded = false;
        n.isEdgeSelected = false;
        n.isNodeSelected = false;
        n.isSimulationNode = false;
        n.isHighlightUCTOnly = false;
        n.isHighlightVisitsValueUCT = false;
    });
    rootNode.isExpanded = true;

    yield {
        state: 'Done', 
        node: prepareTree(rootNode),
        iteration: iterations,
    };

    return {
        state: 'Done', 
        node: prepareTree(rootNode),
        iteration: iterations,
    };
}