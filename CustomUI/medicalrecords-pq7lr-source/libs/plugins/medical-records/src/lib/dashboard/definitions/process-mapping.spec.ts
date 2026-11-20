import {
    activeProcessMappingSource,
    canonicalProcessKey,
    DEFAULT_PROCESS_MAPPING,
    matchesProcessRole,
    matchProcessDefinitions,
    mergeProcessMapping,
    processRoleOf,
    setActiveProcessMapping,
} from './process-mapping';
import { resolveProcessDefinitionFilter, resolveProcessDefinitionKeys, resolveProcessRootKey } from './dashboard-process-catalog';
import { classifyRowsByProcessDefinitions } from '../utils/dashboard-data-source.util';
import { rowMatchesNeed } from '../utils/dashboard-data-plan.util';
import { checkConfiguredProcess, latestDeployedDefinitions } from '../utils/process-definition-options.util';
import { selectLatestChildInstance } from '../utils/agent-mesh-variables.util';

const ROOT_KEY = 'Process_1777481415500';
const mapping = DEFAULT_PROCESS_MAPPING;

describe('matchesProcessRole', () => {
    it('accepts the key or the name, ignoring case and spaces', () => {
        expect(matchesProcessRole({ processDefinitionKey: ROOT_KEY }, 'root', mapping)).toBe(true);
        expect(matchesProcessRole({ processDefinitionKey: 'process_1777481415500' }, 'root', mapping)).toBe(true);
        expect(matchesProcessRole({ processDefinitionName: 'Radicación' }, 'root', mapping)).toBe(true);
        expect(matchesProcessRole({ processDefinitionName: ' MEDICAL-RECORDS ' }, 'root', mapping)).toBe(true);
        expect(matchesProcessRole({ name: 'Document AI Process', key: 'x' }, 'documentAi', mapping)).toBe(true);
        expect(matchesProcessRole({ processDefinitionName: 'documentaiprocess' }, 'documentAi', mapping)).toBe(true);
    });

    it('rejects other processes and similar names', () => {
        expect(matchesProcessRole({ processDefinitionKey: 'Process_1767797409502' }, 'root', mapping)).toBe(false);
        expect(matchesProcessRole({ processDefinitionName: 'medical-records-copy' }, 'root', mapping)).toBe(false);
        expect(matchesProcessRole({ processDefinitionName: 'Medical Records' }, 'root', mapping)).toBe(false);
        expect(matchesProcessRole({}, 'root', mapping)).toBe(false);
        expect(matchesProcessRole(null, 'root', mapping)).toBe(false);
    });

    it('tries the key before the name', () => {
        expect(processRoleOf({ processDefinitionKey: 'Process_1777579089863', processDefinitionName: 'medical-records' }, mapping)).toEqual({
            role: 'agentMesh',
            matchedBy: 'key',
        });
        expect(processRoleOf({ processDefinitionKey: 'Process_other', processDefinitionName: 'Radicación' }, mapping)).toEqual({
            role: 'root',
            matchedBy: 'name',
        });
    });
});

describe('process mapping override', () => {
    it('replaces only the roles given and keeps the defaults otherwise', () => {
        const merged = mergeProcessMapping(DEFAULT_PROCESS_MAPPING, { root: { keys: ['Process_new'] }, agentMesh: { names: [' '] } });
        expect(merged.root.keys).toEqual(['Process_new']);
        expect(merged.root.names).toEqual(['medical-records', 'Radicación']);
        expect(merged.agentMesh).toEqual(DEFAULT_PROCESS_MAPPING.agentMesh);
    });

    it('sets the active mapping and its source, and resets to the defaults', () => {
        setActiveProcessMapping({ root: { keys: ['Process_new'] } });
        expect(activeProcessMappingSource()).toBe('layout');
        expect(canonicalProcessKey('medical-records')).toBe('Process_new');
        setActiveProcessMapping(null);
        expect(activeProcessMappingSource()).toBe('default');
        expect(canonicalProcessKey('medical-records')).toBe(ROOT_KEY);
    });
});

describe('legacy layouts stored by name', () => {
    it('resolves names to the real keys', () => {
        expect(resolveProcessRootKey({ processDefinitionKey: 'medical-records' }, mapping)).toBe(ROOT_KEY);
        expect(resolveProcessRootKey({ processDefinitionName: 'Radicación' }, mapping)).toBe(ROOT_KEY);
        expect(resolveProcessRootKey({}, mapping)).toBe(ROOT_KEY);
        expect(
            resolveProcessDefinitionKeys(
                { processDefinitionKey: 'medical-records', metricScope: 'tree', includedSubprocessDefinitionKeys: ['AgentMesh', 'Document AI Process'] },
                mapping
            )
        ).toEqual([ROOT_KEY, 'Process_1777579089863', 'Process_1767797409502']);
    });

    it('queries every known name of the root and checks the key on the client', () => {
        const filter = resolveProcessDefinitionFilter({ processDefinitionKey: 'medical-records', metricScope: 'root' }, mapping);
        expect(filter.keys).toEqual([ROOT_KEY]);
        expect(filter.names).toEqual(['medical-records', 'Radicación']);
    });

    it('keeps an unmapped widget key with its stored definition name', () => {
        const filter = resolveProcessDefinitionFilter({ processDefinitionKey: 'Process_9', processDefinitionName: 'Other flow' }, mapping);
        expect(filter).toEqual({ keys: ['Process_9'], names: ['Other flow'], source: 'widget' });
    });

    it('proposes the deployed definition equivalent to a stored name', () => {
        const deployed = latestDeployedDefinitions([
            { key: ROOT_KEY, name: 'medical-records', version: 104 },
            { key: ROOT_KEY, name: 'medical-records', version: 105 },
            { key: 'Process_1767797409502', name: 'Document AI Process', version: 30 },
        ]);
        expect(deployed.length).toBe(2);
        expect(checkConfiguredProcess(ROOT_KEY, deployed, mapping)).toEqual({ storedByKey: true, equivalent: null });
        expect(checkConfiguredProcess('Radicación', deployed, mapping).equivalent).toEqual({ key: ROOT_KEY, name: 'medical-records', version: 105 });
        expect(checkConfiguredProcess('Unknown flow', deployed, mapping)).toEqual({ storedByKey: false, equivalent: null });
    });
});

describe('row filtering by key or name', () => {
    const rows = [
        { id: 'a', processDefinitionKey: ROOT_KEY, processDefinitionName: 'Radicación', status: 'RUNNING' },
        { id: 'b', processDefinitionKey: ROOT_KEY, processDefinitionName: 'medical-records', status: 'RUNNING' },
        { id: 'c', processDefinitionKey: '', processDefinitionName: 'Radicación', status: 'RUNNING' },
        { id: 'd', processDefinitionKey: 'Process_1777579089863', processDefinitionName: 'AgentMesh', status: 'RUNNING' },
        { id: 'e', status: 'RUNNING' },
    ];

    it('never drops a row with the root key, whatever its name, and counts key and name matches', () => {
        const result = classifyRowsByProcessDefinitions(rows, [ROOT_KEY], mapping);
        expect(result.rows.map((row) => row.id)).toEqual(['a', 'b', 'c', 'e']);
        expect(result.byKey).toBe(2);
        expect(result.byName).toBe(1);
        expect(result.dropped).toBe(1);
    });

    it('accepts legacy definitions given by name too', () => {
        expect(matchProcessDefinitions(rows[0], ['medical-records'], mapping)).toBe('key');
        expect(matchProcessDefinitions(rows[3], ['medical-records'], mapping)).toBeNull();
    });

    it('slices the data plan by key, so renamed root rows stay in the widget', () => {
        const need = { definitions: [ROOT_KEY], statuses: ['RUNNING'] };
        expect(rowMatchesNeed(rows[0], need)).toBe(true);
        expect(rowMatchesNeed(rows[3], need)).toBe(false);
    });
});

describe('AgentMesh detection', () => {
    it('finds the AgentMesh child by key even when its name changed', () => {
        const children = [
            { id: 'x', processDefinitionKey: 'Process_1767797409502', processDefinitionName: 'AgentMesh v2' },
            { id: 'y', processDefinitionKey: 'Process_1777579089863', processDefinitionName: 'Agent Mesh renamed', startDate: '2026-02-01' },
        ];
        expect(selectLatestChildInstance(children)?.id).toBe('y');
    });
});
