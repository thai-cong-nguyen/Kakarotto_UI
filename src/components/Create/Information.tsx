
import React, { useEffect } from 'react'
import { Gamepad2Icon } from 'lucide-react'
import { useAccount, useReadContract, useWatchContractEvent, useWriteContract, useSignMessage } from 'wagmi';
import { decodeEventLog, encodePacked, keccak256, toBytes, DecodeEventLogReturnType, toHex, stringToBytes, isAddressEqual, getAddress } from 'viem';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Faucet from '@/components/Header/Faucet';
import ConnectButtonCustomOnCreate from './ConnectButtonCustomOnCreate';
import { Button } from '@/components/ui/button';
import { useToast } from '@chakra-ui/react'
import { generateImage } from '@/services/actions/getCharacterImage';
import { createNFTAPI } from '@/services/actions/createNFTCharacter';
import createNFTCharacterMeta from '@/services/actions/createNFTCharacterMeta';
import getABI from '@/contracts/utils/getAbi.util';
import { getKakarottoCharacterAddress } from '@/contracts/utils/getAddress.util';
import ConnectButtonCustom from '@/components/Login/ConnectButtonCustom';
import { getCharacterAction } from '@/contracts/utils/getContractAction.util';

interface InformationProps {
    mintLeft: number;
    setImageLoading: (loading: boolean) => void;
    setImageGenerationLoading: (loading: boolean) => void;
    image: string | undefined;
    setImage: (image: string | undefined) => void;
    setHash: (hash: string | undefined) => void;
    setAccount: (account: string | undefined) => void;
    setTokenURI: (tokenURI: string | undefined) => void;
    setTraits: (traits: any) => void;
    isMinting: boolean;
    setIsMinting: (minting: boolean) => void;
}

type KakarottoCharacterCreatedArgs = {
    tokenId: BigInt,
    tokenUri: string,
    owner: string,
    account: string
}

const pinataURL = process.env.NEXT_PUBLIC_IPFS_URL;

export default function Information(
    {
        mintLeft,
        setImageLoading,
        setImageGenerationLoading,
        image,
        setImage,
        setHash,
        setAccount,
        setTokenURI,
        setTraits,
        isMinting,
        setIsMinting
    }: InformationProps
) {
    const { isConnected, address, chainId } = useAccount();
    const [isGenerating, setIsGenerating] = React.useState<boolean>(false);
    const toast = useToast();
    const { isError: signMessageIsError, reset: signMessageReset, signMessageAsync, isPending: signMessageIsPending } = useSignMessage();
    const tokenBalance = 100;

    const resetStates = React.useCallback(() => {
        setImage(undefined);
        setImageLoading(false);
        setImageGenerationLoading(false);
        setIsMinting(false);
        setHash(undefined);
        setAccount(undefined);
        setIsGenerating(false);
        signMessageReset();
    }, [signMessageReset]);

    useEffect(() => {
        resetStates();
    }, [resetStates]);

    const signMessageCreateNFT = async ({ tokenURI, creator }: { tokenURI: string, creator: `0x${string}` }): Promise<any> => {
        try {
            const MINT_ACTION = getCharacterAction("MINT_ACTION");
            const signature = await signMessageAsync({
                message: {
                    raw: toBytes(
                        keccak256(
                            encodePacked(
                                ["bytes32", "string", "address"],
                                [MINT_ACTION, tokenURI, creator]
                            )
                        )
                    )
                }
            });
            return signature;
        } catch (error) {
            console.log("Error signing message: ", error);
            return undefined;
        }

    };

    const generateConditional = (): boolean => {
        return image !== undefined;
    };

    const mintConditional = (): boolean => {
        if (!isConnected) return true;
        if (!image) return true;
        if (mintLeft === 0) return true;
        if (!generateConditional()) return true;
        return isMinting;
    };

    useWatchContractEvent({
        address: getKakarottoCharacterAddress(chainId),
        abi: getABI("KakarottoCharacter"),
        eventName: "KakarottoCharacterCreated",
        onLogs(logs) {
            const eventDecoded: DecodeEventLogReturnType = decodeEventLog({
                abi: getABI("KakarottoCharacter"),
                data: logs[0].data,
                topics: logs[0].topics,
                strict: true
            });
            const args = eventDecoded.args as unknown as KakarottoCharacterCreatedArgs;
            if (isAddressEqual(getAddress(args ? args.owner : "", chainId), getAddress(address as string, chainId))) {
                setIsMinting(false);
                toast({
                    title: "Mint NFT Successfully!",
                    status: "success",
                    duration: 2500,
                    isClosable: true,
                    position: "bottom-right"
                });
                // Call the API to save to the database
                console.log("NFT minted successfully");
            }
        }
    });

    return (
        <div className='flex flex-col gap-5 pl-10 pt-10 w-1/2'>
            <div className="flex flex-col justify-center gap-5">
                <span className='font-bold text-4xl text-primary'>Mint your Kakarotto Character</span>
                <div className="flex flex-row items-center gap-1">
                    <span className='opacity-50 '>
                        This NFT is used to access Kakarotto Game in the future
                    </span>
                    <Gamepad2Icon />
                </div>
                {isConnected
                    ?
                    <div className={`relative flex flex-row items-center justify-between gap-5 border-2 border-primary rounded-lg p-3 overflow-hidden min-h-24 h-full`}>
                        <div className="flex flex-row items-center justify-between gap-3">
                            <Avatar className='z-5'>
                                <AvatarImage src="https://github.com/shadcn.png" />
                                <AvatarFallback>CN</AvatarFallback>
                            </Avatar>
                            <ConnectButtonCustomOnCreate />
                        </div>
                        <span className='border-2 border-secondary text-secondary rounded-full p-3 bg-primary'>Connected</span>

                    </div>
                    :
                    <div className={`relative flex flex-row items-center justify-between gap-5 border-2 border-primary rounded-lg p-3 overflow-hidden min-h-24`}>
                        <div className={`${isConnected ? "invisible" : "visible"} absolute inset-0 bg-secondary/100 blur-lg z-10`}></div>
                        <div className={`${isConnected ? "invisible" : "visible"} absolute inset-0 z-20 flex items-center justify-center`}>
                            <ConnectButtonCustom />
                        </div>
                    </div>}

            </div>
            <div className="flex flex-row items-center justify-between">
                <div className="flex flex-col justify-center gap-2">
                    <span className='text-2xl font-bold text-primary'>Faucet token (
                        {mintLeft}
                        /1)</span>
                    <span className='opacity-60'>{`Your token balance: ${tokenBalance} KKR`}</span>
                </div>
                <Faucet />
            </div>
            <div className="flex flex-row items-center justify-between">
                <span>Generate Image</span>
                <Button className='transition delay-100 duration-200 ease-in-out hover:scale-90' onClick={async () => {
                    setImage(undefined);
                    setImageLoading(true);
                    try {
                        const imageResponse = await generateImage();
                        if (imageResponse && imageResponse.data) {
                            setImage(imageResponse.data);
                            toast({
                                title: "Generate image Successfully!",
                                status: "success",
                                duration: 2500,
                                isClosable: true,
                                position: "bottom-right"
                            });
                        } else {
                            toast({
                                title: "Generate image failed!",
                                description: "Please try again later",
                                status: "error",
                                duration: 2500,
                                isClosable: true,
                                position: "bottom-right"
                            });
                        }
                    } catch (error) {
                        console.error("Error generating image:", error);
                        toast({
                            title: "Generate image failed!",
                            description: "Please try again later",
                            status: "error",
                            duration: 2500,
                            isClosable: true,
                            position: "bottom-right"
                        });
                    } finally {
                        setImageLoading(false);
                    }
                }}
                >Generate Image</Button>
            </div>
            <div className="flex flex-row items-center justify-between">
                <span>Generate and Mint NFT</span>
                <Button className='transition delay-100 duration-200 ease-in-out hover:scale-90' disabled={mintConditional()} onClick={async () => {
                    setIsMinting(true);
                    if (!image) {
                        toast({
                            title: "Generate image first!",
                            description: "Please generate image before minting",
                            status: "error",
                            duration: 2500,
                            isClosable: true,
                            position: "bottom-right"
                        });
                        return;
                    }
                    console.log(image);
                    const tokenURI = "Character" + "_" + keccak256(stringToBytes(address as string)) + "_" + Date.now();
                    // Sign Create NFT
                    const signature = await signMessageCreateNFT({ tokenURI: `${tokenURI}`, creator: address ? address : "0x" });
                    if (signMessageIsError || signature == undefined) {
                        toast({
                            title: "Sign message failed !",
                            description: "Please try again later",
                            status: "error",
                            duration: 2500,
                            isClosable: true,
                            position: "bottom-right"
                        });
                        setIsMinting(false);
                        return;
                    }
                    // Call the API to create the NFT
                    const relay = await createNFTAPI({
                        creator: address ? address : "0x",
                        createNFTSignature: signature,
                        tokenURI,
                        networkId: chainId ? chainId : 0,
                        image: `${pinataURL}/${image}`,
                    });
                    if (relay == undefined || relay.error) {
                        // Error toast
                        toast({
                            title: "Create NFT failed !",
                            description: "Please try again later",
                            status: "error",
                            duration: 2500,
                            isClosable: true,
                            position: "bottom-right"
                        });
                        setIsMinting(false);
                        return;
                    }
                    const traits = relay.data.traits;
                    const createCharacterResponse = relay.data.response;
                    setTokenURI(tokenURI);
                    setAccount(createCharacterResponse.account);
                    setHash(createCharacterResponse.txHash);
                    setTraits(traits);
                    setIsMinting(false);
                }}
                >Mint</Button>
            </div>
        </div >
    )
}