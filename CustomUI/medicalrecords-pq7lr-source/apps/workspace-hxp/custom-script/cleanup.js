/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

const { Configuration, DocumentApi, QueryApi } = require('@hylandsoftware/hxcs-js-client/cjs/index');
const { subDays, format } = require('date-fns');
const { getAuthToken } = require('../../../scripts/utils/get-auth-token');
const { logError } = require('../../../scripts/utils/axios-error-handler');

// use: npm run start workspace-hxp:cleanup [days] or npm run nx:run-target -- workspace-hxp:cleanup [days]
(async () => {
    const basePath = process.env['APP_CONFIG_ECM_HOST'];
    let accessToken = await getAuthToken();
    const configuration = new Configuration({
        basePath,
        accessToken,
    });

    const queryApi = new QueryApi(configuration);
    const documentApi = new DocumentApi(configuration);

    const refreshToken = async () => {
        console.log('🔄 Refreshing authentication token...');
        accessToken = await getAuthToken();
        configuration.accessToken = accessToken;
        console.log('✅ Token refreshed successfully');
    };

    const filterDocumentsForDeletion = (documents) => {
        console.log(`🟡 Filtering documents for deletion...`);

        const protectedIds = new Set();
        const now = new Date();

        documents.forEach(doc => {
            const isCurrentlyRetained = doc.sysgov_retainUntil && new Date(doc.sysgov_retainUntil) > now;
            if (isCurrentlyRetained) {
                protectedIds.add(doc.sys_id);
                doc.sys_ancestorIds?.forEach(id => protectedIds.add(id));
            }
        });
        protectedIds.delete('00000000-0000-0000-0000-000000000000');

        if (protectedIds.size > 0) {
            console.log(`⏭️  Skipping ${protectedIds.size} protected documents and their ancestors`);
        }

        // Create set of IDs with candidates for deletion (not protected)
        const deletableIds = new Set(documents.filter(doc => !protectedIds.has(doc.sys_id)).map(doc => doc.sys_id));

        if (deletableIds.size === 0) {
            console.log(`🔒 All found documents are protected, nothing to delete`);
            return [];
        }

        // Filter to only top-level documents to prevent 404s after parent deletions
        const docsToDelete = documents.filter(doc => {
            const isDeletable = deletableIds.has(doc.sys_id);
            const hasNoDeletableAncestors = !(doc.sys_ancestorIds || []).some(id => deletableIds.has(id));
            return isDeletable && hasNoDeletableAncestors;
        });

        if (docsToDelete.length > 0) {
            const skippedCount = deletableIds.size - docsToDelete.length;
            const childrenInfo = skippedCount > 0 ? `, skipping ${skippedCount} of their children` : '';
            console.log(`📊 Will delete ${docsToDelete.length} documents${childrenInfo}`);
        }

        return docsToDelete;
    };

    const deleteDocumentsById = async (documents) => {
        const docCount = documents.length;
        const logLimit = 100;
        const logAll = docCount <= logLimit * 2;
        const upperLimit = docCount - logLimit;

        let successCount = 0;
        let processedCount = 0;

        console.log(`🟡 Deleting found documents...`);

        for (const doc of documents) {
            processedCount++;
            try {
                try {
                    await documentApi.deleteDocumentById(doc.sys_id);
                } catch (error) {
                    if (error.response?.status === 401) {
                        console.log(`⚠️  Document ${processedCount} "${doc.sys_title}" - 401 Unauthorized, refreshing token...`);
                        await refreshToken();
                        await documentApi.deleteDocumentById(doc.sys_id);
                    } else {
                        throw error;
                    }
                }
                successCount++;

                // Log only first and last <logLimit> deletions
                if (logAll || processedCount <= logLimit || processedCount > upperLimit) {
                    console.log(`${processedCount}. Deleted "${doc.sys_title}"`);
                } else if (processedCount === logLimit + 1) {
                    console.log(`Deleting ${docCount - logLimit * 2} documents silently...`);
                }
            } catch (error) {
                logError(`❌ Failed to delete document ${processedCount} "${doc.sys_title}", id: "${doc.sys_id}":`, error);
            }
        }
        console.log(`✅ Successfully deleted ${successCount} documents`);
        if (successCount < processedCount) {
            console.log(`❗️ Failed to delete ${processedCount - successCount} documents`);
        }
    };

    const fetchDocuments = async (query) => {
        const limit = 100;
        let offset = 0;
        let allDocuments = [];
        let response;

        try {
            response = await queryApi.getDocumentsByQuery({ query, limit, offset });
        } catch (error) {
            logError('❌ Failed to get documents:', error);
            return [];
        }

        const totalCount = response.data.totalCount;
        if (totalCount === 0) {
            console.log(`✅ No documents found, skipping cleanup`);
            return [];
        }

        const pagesCount = Math.ceil(totalCount / limit);
        console.log(`Total count: ${totalCount}, pages: ${pagesCount}`);

        allDocuments = response.data.documents;
        if (pagesCount > 1) {
            console.log(`Found ${allDocuments.length} documents on page 1`);
        }

        for (let page = 1; page < pagesCount; page++) {
            const logPage = `page ${page + 1}`;
            offset = page * limit;
            try {
                response = await queryApi.getDocumentsByQuery({ query, limit, offset });
            } catch (error) {
                logError(`❌ Failed to fetch ${logPage}:`, error);
                continue;
            }
            const foundDocs = response.data.documents;
            console.log(`Found ${foundDocs.length} documents on ${logPage}`);
            allDocuments = [...allDocuments, ...foundDocs];
        }

        const finalCount = allDocuments.length;
        if (finalCount < totalCount) {
            console.log(`👻 Found ${totalCount - finalCount} potential ghost documents`);
        }
        if (finalCount > 0) {
            console.log(`👀 Found ${finalCount} valid documents`);
        } else {
            console.log(`❗️ No valid documents found, skipping cleanup`);
            return [];
        }

        return allDocuments;
    };

    const days = process.argv[2];
    const beforeDate = subDays(new Date(), days);
    const formattedDate = format(beforeDate, 'yyyy-MM-dd');

    console.log(`🔍 Searching for documents created before ${formattedDate}, on ${basePath}`);

    const query = `SELECT * FROM SysContent WHERE sys_created <= DATE '${formattedDate}'`;
    const allDocuments = await fetchDocuments(query);

    if (allDocuments.length > 0) {
        const documentsToDelete = filterDocumentsForDeletion(allDocuments);

        if (documentsToDelete.length > 0) {
            await deleteDocumentsById(documentsToDelete);
        }
    }

    console.log(`🧹 Cleanup completed`);
})();
