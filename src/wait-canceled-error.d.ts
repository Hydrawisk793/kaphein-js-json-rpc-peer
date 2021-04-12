export declare class WaitCanceledError extends Error
{
    public constructor(
        message? : string | null,
        data? : any
    );

    public readonly data : any;
}
