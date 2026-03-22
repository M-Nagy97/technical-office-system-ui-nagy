import { Component, OnInit, signal, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { TreeModule } from 'primeng/tree';
import { TabViewModule } from 'primeng/tabview';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService, TreeNode } from 'primeng/api';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  OrganizationUnitsService,
  JobPositionsService,
  OrganizationUnitDto,
  JobPositionDto,
} from '../../core/api/generated';

/** API may return hierarchy fields before swagger client is regenerated */
type JobPositionWithHierarchy = JobPositionDto & {
  organizationUnitId?: string | null;
  parentPositionId?: string | null;
};

@Component({
  selector: 'app-organization-structure',
  standalone: true,
  imports: [
    TreeModule,
    TabViewModule,
    CardModule,
    ButtonModule,
    ToastModule,
    ProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './organization-structure.component.html',
  styleUrl: './organization-structure.component.scss',
  providers: [MessageService],
})
export class OrganizationStructureComponent implements OnInit {
  private readonly organizationUnitsService = inject(OrganizationUnitsService);
  private readonly jobPositionsService = inject(JobPositionsService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(true);
  readonly orgTree = signal<TreeNode[]>([]);
  readonly positionTree = signal<TreeNode[]>([]);

  private flatUnits: OrganizationUnitDto[] = [];
  private flatPositions: JobPositionWithHierarchy[] = [];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      units: this.organizationUnitsService.organizationUnitsGetAll(),
      positions: this.jobPositionsService.jobPositionsGetAll(),
    }).subscribe({
      next: ({ units, positions }) => {
        if (!units.success || !units.data?.length) {
          this.flatUnits = [];
          this.orgTree.set([]);
        } else {
          this.flatUnits = units.data;
          const nodes = this.buildOrganizationTree(units.data);
          this.setExpanded(nodes, true);
          this.orgTree.set(nodes);
        }

        if (!positions.success || !positions.data?.length) {
          this.flatPositions = [];
          this.positionTree.set([]);
        } else {
          this.flatPositions = positions.data as JobPositionWithHierarchy[];
          const posNodes = this.buildPositionTree(this.flatPositions);
          this.setExpanded(posNodes, true);
          this.positionTree.set(posNodes);
        }

        if (!units.success) {
          this.messageService.add({
            severity: 'warn',
            summary: this.translate.instant('organization_structure_page.warn'),
            detail: units.message ?? this.translate.instant('organization_structure_page.units_failed'),
          });
        }
        if (!positions.success) {
          this.messageService.add({
            severity: 'warn',
            summary: this.translate.instant('organization_structure_page.warn'),
            detail: positions.message ?? this.translate.instant('organization_structure_page.positions_failed'),
          });
        }

        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('organization_structure_page.error_load'),
          detail: this.translate.instant('organization_structure_page.error_load_detail'),
        });
      },
    });
  }

  expandAll(): void {
    this.setExpanded(this.orgTree(), true);
    this.setExpanded(this.positionTree(), true);
    this.orgTree.set([...this.orgTree()]);
    this.positionTree.set([...this.positionTree()]);
  }

  collapseAll(): void {
    this.setExpanded(this.orgTree(), false);
    this.setExpanded(this.positionTree(), false);
    this.orgTree.set([...this.orgTree()]);
    this.positionTree.set([...this.positionTree()]);
  }

  unitSubtitle(node: TreeNode): string {
    const u = node.data as OrganizationUnitDto | undefined;
    if (!u?.parentId) return '';
    const parent = this.flatUnits.find((x) => x.id === u.parentId);
    if (!parent) return '';
    return parent.name ?? parent.code ?? '';
  }

  positionSubtitle(node: TreeNode): string {
    const p = node.data as JobPositionWithHierarchy | undefined;
    if (!p) return '';
    const parts: string[] = [];
    const uid = p.organizationUnitId;
    if (uid) {
      const unit = this.flatUnits.find((x) => x.id === uid);
      if (unit) parts.push(unit.name ?? unit.code ?? uid);
    }
    const pid = p.parentPositionId;
    if (pid) {
      const parentPos = this.flatPositions.find((x) => x.id === pid);
      if (parentPos) parts.push(parentPos.name ?? parentPos.code ?? pid);
    }
    return parts.join(' · ');
  }

  private buildOrganizationTree(units: OrganizationUnitDto[]): TreeNode[] {
    const withId = units.filter((u) => u.id);
    const map = new Map<string, TreeNode>();
    for (const u of withId) {
      map.set(u.id!, {
        key: u.id!,
        label: this.formatUnitLabel(u),
        data: u,
        children: [],
      });
    }
    const roots: TreeNode[] = [];
    for (const u of withId) {
      const node = map.get(u.id!)!;
      const pid = u.parentId;
      if (pid && map.has(pid)) {
        map.get(pid)!.children!.push(node);
      } else {
        roots.push(node);
      }
    }
    this.sortTreeByCode(roots, (n) => (n.data as OrganizationUnitDto).code);
    return roots;
  }

  private buildPositionTree(positions: JobPositionWithHierarchy[]): TreeNode[] {
    const withId = positions.filter((p) => p.id);
    const map = new Map<string, TreeNode>();
    for (const p of withId) {
      map.set(p.id!, {
        key: p.id!,
        label: this.formatPositionLabel(p),
        data: p,
        children: [],
      });
    }
    const roots: TreeNode[] = [];
    for (const p of withId) {
      const node = map.get(p.id!)!;
      const pid = p.parentPositionId;
      if (pid && map.has(pid)) {
        map.get(pid)!.children!.push(node);
      } else {
        roots.push(node);
      }
    }
    this.sortTreeByCode(roots, (n) => (n.data as JobPositionWithHierarchy).code);
    return roots;
  }

  private formatUnitLabel(u: OrganizationUnitDto): string {
    const code = u.code?.trim();
    const name = u.name?.trim();
    if (code && name) return `${code} — ${name}`;
    return code ?? name ?? u.id ?? '';
  }

  private formatPositionLabel(p: JobPositionWithHierarchy): string {
    const code = p.code?.trim();
    const name = p.name?.trim();
    if (code && name) return `${code} — ${name}`;
    return code ?? name ?? p.id ?? '';
  }

  private sortTreeByCode(nodes: TreeNode[], codeOf: (n: TreeNode) => string | null | undefined): void {
    nodes.sort((a, b) => (codeOf(a) ?? '').localeCompare(codeOf(b) ?? '', undefined, { numeric: true }));
    for (const n of nodes) {
      if (n.children?.length) this.sortTreeByCode(n.children, codeOf);
    }
  }

  private setExpanded(nodes: TreeNode[], expanded: boolean): void {
    for (const n of nodes) {
      n.expanded = expanded;
      if (n.children?.length) this.setExpanded(n.children, expanded);
    }
  }
}
