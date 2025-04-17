import {
	AuthMethodScope,
	AuthMethodType,
	LitNetwork,
} from "@lit-protocol/constants";
import bs58 from "bs58";

import { type GitHubUser } from "./types";
import {
	getEthersSigner,
	getGithubAuthMethodInfo,
	getLitActionCodeIpfsCid,
	getLitContractsClient,
	getPkpInfoFromMintReceipt,
	getPkpMintCost,
} from "./utils";

const LIT_NETWORK =
	LitNetwork[import.meta.env.VITE_LIT_NETWORK as keyof typeof LitNetwork];

export const mintPkp = async (githubUser: GitHubUser) => {
	try {
		const ethersSigner = await getEthersSigner();
		const litContracts = await getLitContractsClient(ethersSigner, LIT_NETWORK);
		const pkpMintCost = await getPkpMintCost(litContracts);
		const {
			authMethodType: githubAuthMethodType,
			authMethodId: githubAuthMethodId,
		} = getGithubAuthMethodInfo(githubUser);

		console.log("🔄 Minting new PKP...");
		const tx =
			await litContracts.pkpHelperContract.write.mintNextAndAddAuthMethods(
				AuthMethodType.LitAction, // keyType
				[AuthMethodType.LitAction, githubAuthMethodType], // permittedAuthMethodTypes
				[
					`0x${Buffer.from(
						bs58.decode(await getLitActionCodeIpfsCid())
					).toString("hex")}`,
					githubAuthMethodId,
				], // permittedAuthMethodIds
				["0x", "0x"], // permittedAuthMethodPubkeys
				[[AuthMethodScope.SignAnything], [AuthMethodScope.NoPermissions]], // permittedAuthMethodScopes
				true, // addPkpEthAddressAsPermittedAddress
				true, // sendPkpToItself
				{ value: pkpMintCost }
			);
		const receipt = await tx.wait();
		console.log(`✅ Minted new PKP`);

		return getPkpInfoFromMintReceipt(receipt, litContracts);
	} catch (error) {
		console.error(error);
	}
};
export const getPkpForGithubUser = async (githubUser: GitHubUser) => {
	try {
		const ethersSigner = await getEthersSigner();
		const litContracts = await getLitContractsClient(ethersSigner, LIT_NETWORK);
		const { authMethodType: githubAuthMethodType, authMethodId: githubAuthMethodId } =
			getGithubAuthMethodInfo(githubUser);

		console.log(`🔄 Looking for existing PKP for GitHub user: ${githubUser.login}...`);

		const totalPkps = await litContracts.pkpNftContract.read.totalSupply();
		console.log(`Total PKPs in the system: ${totalPkps.toString()}`);

		const BATCH_SIZE = 50;
		const numBatches = Math.ceil(totalPkps.toNumber() / BATCH_SIZE);

		const checkPkpBatch = async (startIdx: number, endIdx: number) => {
			const batchPromises = [];
			for (let i = startIdx; i < endIdx && i < totalPkps.toNumber(); i++) {
				batchPromises.push((async () => {
					try {
						const tokenId = await litContracts.pkpNftContract.read.tokenByIndex(i);
						const isPermitted = await litContracts.pkpPermissionsContract.read.isPermittedAuthMethod(
							tokenId,
							githubAuthMethodType,
							githubAuthMethodId
						);

						if (isPermitted) {
							return {
								tokenId,
								index: i
							};
						}
						return null;
					} catch (err) {
						console.warn(`Error checking PKP at index ${i}:`, err);
						return null;
					}
				})());
			}

			const results = await Promise.all(batchPromises);
			return results.find(result => result !== null);
		};

		for (let i = numBatches - 1; i >= 0; i--) {
			const batchStart = i * BATCH_SIZE;
			const batchEnd = Math.min(totalPkps.toNumber(), batchStart + BATCH_SIZE);

			console.log(`Searching PKPs in range ${batchStart}-${batchEnd}...`);
			const foundInBatch = await checkPkpBatch(batchStart, batchEnd);

			if (foundInBatch) {
				const { tokenId } = foundInBatch;
				console.log(`✅ Found existing PKP for GitHub user in batch ${i + 1}/${numBatches}: ${githubUser.login}`);
				const publicKey = await litContracts.pkpNftContract.read.getPubkey(tokenId);
				const ethAddress = await litContracts.pkpNftContract.read.getEthAddress(tokenId);

				return {
					tokenId: tokenId.toString(),
					publicKey,
					ethAddress,
					isNew: false
				};
			}
		}

		console.log(`ℹ️ No existing PKP found for GitHub user: ${githubUser.login} after comprehensive search`);
		return null;
	} catch (error) {
		console.error("Error checking for existing PKP:", error);
		return null;
	}
};

export const getPkpOrMint = async (githubUser: GitHubUser) => {
	try {
		const existingPkp = await getPkpForGithubUser(githubUser);

		if (existingPkp) {
			return existingPkp;
		}

		console.log("🔄 No existing PKP found. Minting new PKP...");
		const ethersSigner = await getEthersSigner();
		const litContracts = await getLitContractsClient(ethersSigner, LIT_NETWORK);
		const pkpMintCost = await getPkpMintCost(litContracts);
		const {
			authMethodType: githubAuthMethodType,
			authMethodId: githubAuthMethodId,
		} = getGithubAuthMethodInfo(githubUser);

		const tx =
			await litContracts.pkpHelperContract.write.mintNextAndAddAuthMethods(
				AuthMethodType.LitAction, // keyType
				[AuthMethodType.LitAction, githubAuthMethodType], // permittedAuthMethodTypes
				[
					`0x${Buffer.from(
						bs58.decode(await getLitActionCodeIpfsCid())
					).toString("hex")}`,
					githubAuthMethodId,
				], // permittedAuthMethodIds
				["0x", "0x"], // permittedAuthMethodPubkeys
				[[AuthMethodScope.SignAnything], [AuthMethodScope.NoPermissions]], // permittedAuthMethodScopes
				true, // addPkpEthAddressAsPermittedAddress
				true, // sendPkpToItself
				{ value: pkpMintCost }
			);
		const receipt = await tx.wait();
		console.log(`✅ Minted new PKP`);

		const pkpInfo = await getPkpInfoFromMintReceipt(receipt, litContracts);
		return { ...pkpInfo, isNew: true };
	} catch (error) {
		console.error("Error getting or minting PKP:", error);
		throw error;
	}
};
