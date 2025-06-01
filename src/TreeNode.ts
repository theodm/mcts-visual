export interface TreeNode {
  parent: TreeNode | null;
  
  // Tic-Tac-Toe board state represented as a string
  // "---------", "XOXOXOXOX", etc.
  state: string;

  isEdgeSelected: boolean;
  isNodeSelected: boolean;

  isHighlightUCTOnly: boolean;
  isHighlightVisitsValueUCT: boolean;

  children: TreeNode[];

  isSimulationNode?: boolean;

  visits: number;
  uctValue: number;
  realValue: number; 
  value: number;
  isExpanded: boolean;

  player: 'X' | 'O';
}

/**
 * Creates a deep clone of a TreeNode with properly updated parent references
 * @param node The TreeNode to clone
 * @param newParent The parent node for the cloned node (null for root)
 * @returns A deep clone of the TreeNode with updated parent references
 */
export function cloneTreeNode(node: TreeNode, newParent: TreeNode | null = null): TreeNode {  // Create the cloned node with all properties except children
  const clonedNode: TreeNode = {
    ...node,
    parent: newParent,  
  };

  // Recursively clone all children and set their parent to the cloned node
  clonedNode.children = node.children.map(child => cloneTreeNode(child, clonedNode));

  return clonedNode;
}


export function forAllNodes(
  node: TreeNode,
  callback: (node: TreeNode) => void
): void {
  callback(node);

  for (const child of node.children) {
    forAllNodes(child, callback);
  }
}