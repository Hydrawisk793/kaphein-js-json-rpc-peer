export declare class WebSocketClosedError extends Error
{
    public constructor(
        message? : string,
        closeCode? : number
    );

    public readonly closeCode : number;
}
