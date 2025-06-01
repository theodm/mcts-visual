import * as d3 from 'd3';
import './style.css'
import { cloneTreeNode, type TreeNode } from './TreeNode';
import { mcts_search, type MCTSStepResult } from './mcts';
import { getCurrentPlayer, getResultMap, isGameOver } from './tic_tac_toe';

let currentTransform = d3.zoomIdentity.translate(430, 90).scale(0.35);

function render(
  container: HTMLElement,
  state: TreeNode,
  onToggleExpanded: (nodePath: number[]) => void
) {
  console.log('Rendering tree:', state);

  if (!container.querySelector('svg')) {
    container.innerHTML = '<svg></svg>';
  }

  const svg = d3
    .select(container)
    .select('svg') as d3.Selection<SVGSVGElement, unknown, null, undefined>;

  const width = 800;
  const height = 1400;

  svg.attr('viewBox', [0, 0, width, height]);

  function filterHierarchy(node: TreeNode): TreeNode {
    const filtered: TreeNode = {
      ...node,
      children: node.isExpanded ? node.children.map(child => filterHierarchy(child)) : []
    };
    return filtered;
  }

  const filteredTree = filterHierarchy(state);
  const root = d3.hierarchy<TreeNode>(filteredTree);

  d3
    .tree<TreeNode>().nodeSize([200, 160])(root);

  let g = svg.select('g.main-group') as d3.Selection<SVGGElement, unknown, null, undefined>;

  if (g.empty()) {
    g = svg.append('g').attr('class', 'main-group');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .on('start', () => svg.style('cursor', 'grabbing'))
      .on('end', () => svg.style('cursor', 'grab'))
      .on('zoom', ({ transform }) => {
        g.attr('transform', transform.toString());
        currentTransform = transform;
        console.log('Zoom transform updated:', currentTransform); 
      });

    svg.call(zoom);
    svg.on('dblclick.zoom', null);

    // Apply the initial transform immediately
    svg.call(zoom.transform, currentTransform);

    // (svg.call as any)(d3.zoom().transform, currentTransform);
  } else {
    g.attr('transform', currentTransform.toString());
    g.selectAll('*').remove();
  }

  g.selectAll('.link')
    .data(root.links())
    .join('path')
    .attr('class', 'link')
    .attr('d', d3.linkVertical<d3.HierarchyLink<TreeNode>, d3.HierarchyNode<TreeNode>>()
      .x((d: any) => d.x)
      .y((d: any) => d.y)
    )
    .attr('fill', 'none')
    .attr('stroke', (d: any) => d.target.data.isEdgeSelected || d.target.data.isSimulationNode ? '#000' : '#ccc')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', (d: any) => {
      // Gepunktete Linie für Simulation Nodes
      return d.target.data.isSimulationNode ? '5,5' : 'none';
    });

  const linkLabels = g.selectAll('.link-label')
    .data(root.links().filter((d: any) => !d.target.data.isSimulationNode))
    .join('g')
    .attr('class', 'link-label');
 
  linkLabels
    .attr('transform', (d: any) => {
      const midX = (d.source.x + d.target.x) / 2;
      const midY = (d.source.y + d.target.y) / 2;
      return `translate(${midX},${midY})`;
    });

  linkLabels.selectAll('rect')
    .data(d => [d])
    .join('rect')
    .attr('x', -25)
    .attr('y', -20)
    .attr('width', 50)
    .attr('height', 40)
    .attr('fill', (d: any) => getCurrentPlayer(d.source.data.state) === 'X' ? '#fef2f2' : '#eff6ff')
    .attr('stroke', (d: any) => d.target.data.isEdgeSelected ? '#000' : '#ccc')
    .attr('stroke-width', (d: any) => d.target.data.isEdgeSelected ? 2 : 1)
    .attr('rx', 3)
    .attr('ry', 3);

  linkLabels.selectAll('text.link-visits')
    .data(d => [d])
    .join('text')
    .attr('class', 'link-visits')
    .attr('dy', '-7px')
    .attr('text-anchor', 'middle')
    .style('font-size', '8px')
    .style('fill', (d: any) => d.target.data.isHighlightVisitsValueUCT ? '#000' : '#666')
    .style('font-weight', (d: any) => d.target.data.isHighlightVisitsValueUCT ? 'bold' : 'normal')
    .text((d: any) => `Visits: ${d.target.data.visits}`);

  linkLabels.selectAll('text.link-uct')
    .data(d => [d])
    .join('text')
    .attr('class', 'link-uct')
    .attr('dy', '3px')
    .attr('text-anchor', 'middle')
    .style('font-size', '8px')
    .style('fill', (d: any) => d.target.data.isHighlightUCTOnly || d.target.data.isHighlightVisitsValueUCT ? '#000' : '#666')
    .style('font-weight', (d: any) => d.target.data.isHighlightUCTOnly || d.target.data.isHighlightVisitsValueUCT ? 'bold' : 'normal')
    .text((d: any) => `UCT: ${d.target.data.uctValue.toFixed(2)}`);

  linkLabels.selectAll('text.link-value')
    .data(d => [d])
    .join('text')
    .attr('class', 'link-value')
    .attr('dy', '13px')
    .attr('text-anchor', 'middle')
    .style('font-size', '8px')
    .style('fill', (d: any) => d.target.data.isHighlightVisitsValueUCT ? '#000' : '#666')
    .style('font-weight', (d: any) => d.target.data.isHighlightVisitsValueUCT ? 'bold' : 'normal')
    .text((d: any) => `Value: ${d.target.data.realValue.toFixed(2)}`);


  const nodes = g
    .selectAll('.node')
    .data(root.descendants())
    .join('g')
    .attr('class', 'node')
    .attr('transform', (d: any) => `translate(${d.x},${d.y})`);

  const boardSize = 14;
  const half = boardSize * 1.5;

  nodes
    .append('rect')
    .attr('x', -half - 2).attr('y', -half - 2)
    .attr('width', boardSize * 3 + 4)
    .attr('height', boardSize * 3 + 4)
    .attr('rx', 4).attr('ry', 4)
    .attr('fill', d => {
      if (isGameOver(d.data.state)) return '#ffe066';
      return '#fff';
    })
    .attr('stroke', d => isGameOver(d.data.state) ? '#e41' : 'black')
    .attr('stroke-width', d => d.data.isNodeSelected || d.data.isSimulationNode ? 2 : 1);


  nodes.each(function () {
    const n = d3.select(this);
    for (let i = 1; i < 3; i++) {
      n.append('line')
        .attr('x1', -half + i * boardSize).attr('y1', -half)
        .attr('x2', -half + i * boardSize).attr('y2', half)
        .attr('stroke', '#888');
      n.append('line')
        .attr('x1', -half).attr('y1', -half + i * boardSize)
        .attr('x2', half).attr('y2', -half + i * boardSize)
        .attr('stroke', '#888');
    }
  });

  nodes.each(function (d) {
    const chars = d.data.state.split('');
    const sel = d3.select(this);

    chars.forEach((c, idx) => {
      if (c === '-') {
        return;
      }

      const row = ~~(idx / 3), col = idx % 3;
      const cx = -half + col * boardSize + boardSize / 2;
      const cy = -half + row * boardSize + boardSize / 2;

      if (c === 'X') {
        sel.append('line')
          .attr('x1', cx - boardSize / 3).attr('y1', cy - boardSize / 3)
          .attr('x2', cx + boardSize / 3).attr('y2', cy + boardSize / 3)
          .attr('stroke', '#dc2626');
        sel.append('line')
          .attr('x1', cx - boardSize / 3).attr('y1', cy + boardSize / 3)
          .attr('x2', cx + boardSize / 3).attr('y2', cy - boardSize / 3)
          .attr('stroke', '#dc2626');
      }

      if (c === 'O') {
        sel.append('circle')
          .attr('cx', cx).attr('cy', cy)
          .attr('r', boardSize / 3)
          .attr('fill', 'none').attr('stroke', '#2563eb');
      }
    });
  });

  nodes
    .filter(d => isGameOver(d.data.state))
    .append('text')
    .attr('x', 0)
    .attr('y', half + 18)
    .attr('text-anchor', 'middle')
    .attr('font-size', 13)
    .attr('font-weight', 'bold')
    .attr('fill', '#e41')
    .text(d => {
      const winner = getResultMap(d.data.state);
      return `[${winner.X}, ${winner.O}]`;
    });


  nodes.each(function (d) {
    const node = d3.select(this);
    const originalData = state;

    function findOriginalNode(current: TreeNode, path: number[]): TreeNode | null {
      if (path.length === 0) return current;
      const [first, ...rest] = path;
      if (current.children && current.children[first]) {
        return findOriginalNode(current.children[first], rest);
      }
      return null;
    }

    const pathToNode: number[] = [];
    let currentNode = d;
    while (currentNode.parent) {
      const parentChildren = currentNode.parent.children || [];
      const index = parentChildren.indexOf(currentNode);
      pathToNode.unshift(index);
      currentNode = currentNode.parent;
    }

    const originalNode = findOriginalNode(originalData, pathToNode);
    const hasChildren = originalNode && originalNode.children && originalNode.children.length > 0;

    if (hasChildren) {
      const buttonSize = 12;
      const buttonY = half + 8;

      node.append('circle')
        .attr('cx', 0)
        .attr('cy', buttonY - 5)
        .attr('r', buttonSize / 2)
        .attr('fill', '#f0f0f0')
        .attr('stroke', '#666')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('click', function (event) {
          event.stopPropagation();
          event.preventDefault();

          if (onToggleExpanded) {
            onToggleExpanded(pathToNode);
          }
        });

      node.append('text')
        .attr('x', 0)
        .attr('y', buttonY - 5)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .style('cursor', 'pointer')
        .style('pointer-events', 'none') 
        .text(d.data.isExpanded ? '−' : '+');
    }
  });

}

function findNodeByPath(node: TreeNode, path: number[]): TreeNode | null {
  if (path.length === 0) return node;

  const [first, ...rest] = path;

  if (node.children && node.children[first]) {
    return findNodeByPath(node.children[first], rest);
  }

  return null;
}

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('app');

  if (!container) {
    console.error('Container element not found');
    return;
  }

  const params = new URLSearchParams(window.location.search);

  let iterations = parseInt(params.get('iterations') || '') || 1500;
  let startState = params.get('startState') || "---------";

  let search = mcts_search(startState, iterations, Math.sqrt(2));

  let all_states: MCTSStepResult[] = [];

  // Show loading backdrop
  const loadingBackdrop = document.getElementById('loading-backdrop')!;
  const loadingCurrent = document.getElementById('loading-current')!;
  const loadingTotal = document.getElementById('loading-total')!;
  const loadingPercent = document.getElementById('loading-percent')!;
  const loadingProgress = document.getElementById('loading-progress')!;

  loadingBackdrop.style.display = 'flex';
  loadingTotal.textContent = iterations.toString();

  let i = 0;
  let lastIteration = 0;
  
  while (true) {
    const next = search.next();

    if (next.done) {
      break;
    }

    const stepResult = next.value;
    all_states.push(stepResult);

    // Update loading display based on iteration number
    if (stepResult.iteration !== lastIteration) {
      lastIteration = stepResult.iteration;
      const progress = Math.min((stepResult.iteration / iterations) * 100, 100);
      loadingCurrent.textContent = stepResult.iteration.toString();
      loadingPercent.textContent = `${Math.round(progress)}%`;
      loadingProgress.style.width = `${progress}%`;
    }

    i++;
    if (i % 50 === 0) {
      console.log(`Processed ${i} steps`);
      // Allow UI to update by yielding control
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  // Hide loading backdrop
  loadingBackdrop.style.display = 'none';
  
  console.log(`Total steps processed: ${i}`);

  let currentState: MCTSStepResult = all_states[0];
  let currentIndex = 0;
  let updateState = function (state: MCTSStepResult) {
    currentState = state;

    render(container, currentState.node, onToggleExpanded);
  };

  let onToggleExpanded = function (path: number[]) {
    if (currentState) {
      const tree = cloneTreeNode(currentState.node);
      const node = findNodeByPath(tree, path);

      if (node) {
        node.isExpanded = !node.isExpanded;

        updateState({
          ...currentState,
          node: tree,
        });
      }
    }
  };

  let updateStatePerIndex = function (index: number) {
    currentState = all_states[index];
    currentIndex = index;

    document.getElementById("iteration-status")!.innerText = `${currentState.iteration} / ${iterations}`;
    document.getElementById("step-status")!.innerText = `${currentIndex + 1} / ${all_states.length}`;
    
    const status3Element = document.getElementById("status3")!;
    
    status3Element.className = '';
    
    status3Element.style.transform = 'scale(0.95)';
    status3Element.style.opacity = '0.7';
    
    setTimeout(() => {
      status3Element.innerText = currentState.state;
      
      // Setze die entsprechende CSS-Klasse basierend auf dem Zustand
      switch (currentState.state) {
        case 'Start':
          status3Element.className = 'start';
          break;
        case 'Selection':
          status3Element.className = 'selection';
          break;
        case 'Expansion':
          status3Element.className = 'expansion';
          break;
        case 'Simulation':
          status3Element.className = 'simulation';
          break;
        case 'Backpropagation':
          status3Element.className = 'backpropagation';
          break;
        case 'Done':
          status3Element.className = 'done';
          break;
      }
      
      // Zurück zur normalen Größe animieren
      status3Element.style.transform = 'scale(1)';
      status3Element.style.opacity = '1';
    }, 150);

    render(container, currentState.node, onToggleExpanded);
  }

  updateStatePerIndex(0);

  const navigationActions = {
    backwardEnd: () => {
      updateStatePerIndex(0);
    },

    backwardIter: () => {
      if (currentIndex === all_states.length - 1) {
        updateStatePerIndex(all_states.length - 2);
        return;
      }

      // Wir gehen zurück zum letzten Zustand, der entweder "Start" ist oder der gleiche Zustand wie der aktuelle.
      for (let i = currentIndex - 1; i >= 0; i--) {
        if (all_states[i].state === currentState.state || all_states[i].state === 'Start') {
          updateStatePerIndex(i);
          return;
        }
      }
    },

    backward: () => {
      if (currentIndex > 0) {
        updateStatePerIndex(currentIndex - 1);
      }
    },

    forward: () => {
      if (currentIndex < all_states.length - 1) {
        updateStatePerIndex(currentIndex + 1);
      }
    },

    forwardIter: () => {
      if (currentIndex === 0) {
        updateStatePerIndex(1);
        return;
      }

      for (let i = currentIndex + 1; i < all_states.length; i++) {
        if (all_states[i].state === currentState.state || all_states[i].state === 'Done') {
          updateStatePerIndex(i);
          return;
        }
      }
    },

    forwardEnd: () => {
      updateStatePerIndex(all_states.length - 1);
    }
  };

  // Button Event Listeners mit Animation
  const addButtonListener = (id: string, action: () => void) => {
    const button = document.getElementById(id);
    if (button) {
      button.addEventListener('click', () => {
        // Button Animation
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
          button.style.transform = '';
        }, 100);
        
        action();
      });
    }
  };

  addButtonListener("backward_end", navigationActions.backwardEnd);
  addButtonListener("backward_iter", navigationActions.backwardIter);
  addButtonListener("backward", navigationActions.backward);
  addButtonListener("forward", navigationActions.forward);
  addButtonListener("forward_iter", navigationActions.forwardIter);
  addButtonListener("forward_end", navigationActions.forwardEnd);

  const animateButton = (buttonId: string) => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.style.transform = 'scale(0.95)';
      setTimeout(() => {
        button.style.transform = '';
      }, 100);
    }
  };

  document.addEventListener('keydown', (event) => {
    const controlKeys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (controlKeys.includes(event.key)) {
      event.preventDefault();
    }

    switch (event.key) {
      case 'ArrowLeft':
        if (event.ctrlKey) {
          animateButton('backward_iter');
          navigationActions.backwardIter();
        } else {
          animateButton('backward');
          navigationActions.backward();
        }
        break;

      case 'ArrowRight':
        if (event.ctrlKey) {
          animateButton('forward_iter');
          navigationActions.forwardIter();
        } else {
          animateButton('forward');
          navigationActions.forward();
        }
        break;

      case 'Home':
        animateButton('backward_end');
        navigationActions.backwardEnd();
        break;

      case 'End':
        animateButton('forward_end');
        navigationActions.forwardEnd();
        break;
    }
  });

});

